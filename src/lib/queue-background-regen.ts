import { QueueGenerationService } from "./services/queue-generation.service";
import type { SessionStore } from "./session/store.interface";
import { broadcastToSession } from "./websocket/server";
import { WS_EVENTS } from "./websocket/events";
import { MAX_QUEUE_SIZE } from "./constants";

/**
 * Background queue regeneration system with debouncing and locking
 */

// Store for debounce timers and locks
const debounceTimers = new Map<string, NodeJS.Timeout>();
const regenerationLocks = new Set<string>();

const DEBOUNCE_DELAY_MS = 5000; // 5 seconds
const STABLE_TRACK_COUNT = 3;
const REGENERATION_TIMEOUT_MS = 30000; // 30 seconds timeout for queue regeneration

/**
 * Trigger background queue regeneration after participant changes
 * Uses debouncing to batch multiple changes and locking to prevent concurrent regeneration
 *
 * @param sessionId Session ID to regenerate queue for
 * @param store Session store instance
 * @param accessToken Spotify access token for the requesting user
 */
export function triggerBackgroundRegeneration(
  sessionId: string,
  store: SessionStore,
  accessToken: string
): void {
  // Clear existing debounce timer for this session
  const existingTimer = debounceTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new debounce timer
  const timer = setTimeout(async () => {
    await executeQueueRegeneration(sessionId, store, accessToken);
    debounceTimers.delete(sessionId);
  }, DEBOUNCE_DELAY_MS);

  debounceTimers.set(sessionId, timer);

  console.log(`[QueueRegen] Debounced regeneration scheduled for session ${sessionId} in ${DEBOUNCE_DELAY_MS}ms`);
}

/**
 * Execute the queue regeneration with locking mechanism and timeout
 */
async function executeQueueRegeneration(
  sessionId: string,
  store: SessionStore,
  accessToken: string
): Promise<void> {
  // Check if regeneration is already in progress
  if (regenerationLocks.has(sessionId)) {
    console.log(`[QueueRegen] Regeneration already in progress for session ${sessionId}, skipping`);
    return;
  }

  // Acquire lock
  regenerationLocks.add(sessionId);
  console.log(`[QueueRegen] Starting regeneration for session ${sessionId}`);

  try {
    // Wrap regeneration in timeout to prevent hanging
    await Promise.race([
      performRegeneration(sessionId, store, accessToken),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Queue regeneration timeout')), REGENERATION_TIMEOUT_MS)
      )
    ]);
  } catch (error) {
    console.error(`[QueueRegen] Error regenerating queue for session ${sessionId}:`, error);

    // Log additional error details
    if (error instanceof Error) {
      console.error('[QueueRegen] Error details:', {
        message: error.message,
        stack: error.stack,
      });
    } else if (error && typeof error === 'object') {
      console.error('[QueueRegen] Error details:', error);
    }
  } finally {
    // Release lock
    regenerationLocks.delete(sessionId);
    console.log(`[QueueRegen] Released lock for session ${sessionId}`);
  }
}

/**
 * Perform the actual queue regeneration
 */
async function performRegeneration(
  sessionId: string,
  store: SessionStore,
  accessToken: string
): Promise<void> {
  try {
    // Get current session state
    const session = await store.get(sessionId);

    if (!session) {
      console.log(`[QueueRegen] Session ${sessionId} not found, skipping regeneration`);
      return;
    }

    // Skip if no profile yet
    if (!session.profile) {
      console.log(`[QueueRegen] Session ${sessionId} has no profile yet, skipping regeneration`);
      return;
    }

    // Preserve first 3 tracks as stable
    const stableCount = Math.min(session.queue.length, STABLE_TRACK_COUNT);
    console.log(`[QueueRegen] Preserving ${stableCount} stable tracks`);

    // Calculate how many new tracks we need
    const targetSize = MAX_QUEUE_SIZE - stableCount;

    if (targetSize <= 0) {
      console.log(`[QueueRegen] Queue is full, skipping regeneration`);
      return;
    }

    // Generate new queue
    const queueService = new QueueGenerationService(accessToken);
    const newQueue = await queueService.generateQueue(session, targetSize);

    console.log(`[QueueRegen] Generated ${newQueue.length} new tracks`);

    // Merge existing queue with new queue (preserves first 3 as stable)
    const mergedQueue = queueService.mergeWithStableQueue(session.queue, newQueue);

    // Update session
    session.queue = mergedQueue;
    session.updatedAt = Date.now();
    await store.set(sessionId, session);

    console.log(`[QueueRegen] Updated queue with ${mergedQueue.length} total tracks (${stableCount} stable, ${newQueue.length} new)`);

    // Broadcast queue update to all clients
    broadcastToSession(sessionId, WS_EVENTS.QUEUE_UPDATED, mergedQueue);
    console.log(`[QueueRegen] Broadcasted queue update to session ${sessionId}`);
  } catch (error) {
    console.error(`[QueueRegen] Error in performRegeneration for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Cancel pending regeneration for a session (e.g., when session is deleted)
 */
export function cancelPendingRegeneration(sessionId: string): void {
  const timer = debounceTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(sessionId);
    console.log(`[QueueRegen] Cancelled pending regeneration for session ${sessionId}`);
  }
}

/**
 * Get regeneration status for debugging
 */
export function getRegenerationStatus(sessionId: string): {
  isPending: boolean;
  isLocked: boolean;
} {
  return {
    isPending: debounceTimers.has(sessionId),
    isLocked: regenerationLocks.has(sessionId),
  };
}
