import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { checkAndRepopulateQueue } from "@/lib/queue-auto-repopulate";
import { normalizeQueue } from "@/lib/utils/queue";
import { z } from "zod";

const trackChangeSchema = z.object({
  sessionId: z.string().min(1),
  trackId: z.string().min(1),
});

/**
 * POST /api/playback/track-change
 * Handle natural track progression - remove played track from queue
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = trackChangeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionId, trackId } = validation.data;

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

    // Find and remove the track from queue if it's the first one
    if (targetSession.queue.length > 0 && targetSession.queue[0].track.id === trackId) {
      const completedTrack = targetSession.queue.shift();
      if (completedTrack) {
        targetSession.playedTracks.push(completedTrack.track.id);

        // Normalize queue positions and stable flags
        targetSession.queue = normalizeQueue(targetSession.queue);

        targetSession.updatedAt = Date.now();
        await store.set(sessionId, targetSession);

        // Check if queue needs repopulation
        await checkAndRepopulateQueue(targetSession, store, session.accessToken);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling track change:", error);

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
