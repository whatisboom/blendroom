import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { QueueGenerationService } from "@/lib/services/queue-generation.service";
import { broadcastToSession } from "@/lib/websocket/server";
import { createErrorResponse } from "@/lib/utils/api-error-handler";

// Increase timeout for queue generation (multiple Spotify API calls)
export const maxDuration = 60;

/**
 * POST /api/queue/[sessionId]/generate
 * Manually trigger queue generation (DJ only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Get session
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);
    const targetSession = await sessionService.getSession(sessionId);

    if (!targetSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if user is DJ
    if (!sessionService.isDJ(targetSession, session.user.id)) {
      return NextResponse.json(
        { error: "Only DJs can generate the queue" },
        { status: 403 }
      );
    }

    // Check if profile exists
    if (!targetSession.profile) {
      return NextResponse.json(
        { error: "Session profile not ready. Try again in a moment." },
        { status: 400 }
      );
    }

    // Generate queue
    const queueService = new QueueGenerationService(session.accessToken);
    const newQueue = await queueService.generateQueue(targetSession);

    // Merge with stable tracks
    const stableTracks = targetSession.queue.slice(0, 3);
    targetSession.queue = queueService.mergeWithStableQueue(
      stableTracks,
      newQueue
    );

    targetSession.updatedAt = Date.now();

    await store.set(sessionId, targetSession);

    // Broadcast queue update to all session participants
    broadcastToSession(sessionId, "queue_updated", targetSession.queue);

    return NextResponse.json({
      queue: targetSession.queue,
      generated: newQueue.length,
    });
  } catch (error) {
    return createErrorResponse(error, "Queue Generate");
  }
}
