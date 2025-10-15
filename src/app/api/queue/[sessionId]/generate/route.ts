import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { QueueGenerationService } from "@/lib/services/queue-generation.service";

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
    const queueService = new QueueGenerationService(session.accessToken, store);
    const newQueue = await queueService.generateQueue(targetSession);

    // Merge with stable tracks
    const stableTracks = targetSession.queue.slice(0, 3);
    targetSession.queue = queueService.mergeWithStableQueue(
      stableTracks,
      newQueue
    );

    targetSession.updatedAt = Date.now();

    await store.set(sessionId, targetSession);

    return NextResponse.json({
      queue: targetSession.queue,
      generated: newQueue.length,
    });
  } catch (error) {
    console.error("Error generating queue:", error);

    // Handle Spotify API errors
    if (error && typeof error === 'object' && 'body' in error) {
      const spotifyError = error as { statusCode?: number; body?: { error?: { message?: string } } };
      const errorMessage = spotifyError.body?.error?.message || "Spotify API error";
      console.error("Spotify API error details:", {
        statusCode: spotifyError.statusCode,
        body: spotifyError.body,
        message: errorMessage
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: spotifyError.statusCode || 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
