import { QueueGenerationService } from "./services/queue-generation.service";
import type { Session } from "@/types";
import type { SessionStore } from "./session/store.interface";
import { MIN_QUEUE_SIZE, MAX_QUEUE_SIZE } from "./constants";

/**
 * Check if queue needs repopulation and generate new tracks if needed
 * @param session The session to check
 * @param store Session store for persistence
 * @param accessToken Spotify access token
 * @returns true if queue was repopulated
 */
export async function checkAndRepopulateQueue(
  session: Session,
  store: SessionStore,
  accessToken: string
): Promise<boolean> {
  // Skip if queue is still healthy
  if (session.queue.length >= MIN_QUEUE_SIZE) {
    return false;
  }

  // Skip if session doesn't have a profile yet
  if (!session.profile) {
    console.log("Cannot repopulate queue: Session profile not ready");
    return false;
  }

  try {
    // Calculate how many tracks to generate to reach max queue size
    const currentQueueSize = session.queue.length;
    const targetSize = Math.min(MAX_QUEUE_SIZE - currentQueueSize, MAX_QUEUE_SIZE);

    console.log(`Auto-repopulating queue (current: ${currentQueueSize}, generating: ${targetSize})`);

    // Generate new queue
    const queueService = new QueueGenerationService(accessToken);
    const newQueue = await queueService.generateQueue(session, targetSize);

    // Merge with existing stable tracks
    const stableTracks = session.queue.slice(0, 3);
    session.queue = queueService.mergeWithStableQueue(stableTracks, newQueue);

    session.updatedAt = Date.now();
    await store.set(session.id, session);

    console.log(`Queue repopulated: ${newQueue.length} tracks added (total: ${session.queue.length})`);

    return true;
  } catch (error) {
    console.error("Error auto-repopulating queue:", error);
    return false;
  }
}
