import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { checkAndRepopulateQueue } from "@/lib/queue-auto-repopulate";
import { broadcastToSession } from "@/lib/websocket/server";
import { normalizeQueue } from "@/lib/utils/queue";
import { PlaybackState } from "@/types/spotify";
import { z } from "zod";

const skipSchema = z.object({
  sessionId: z.string().min(1),
  deviceId: z.string().optional(),
});

/**
 * POST /api/playback/skip
 * Skip to next track (host/DJ only)
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
    const validation = skipSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionId, deviceId } = validation.data;

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
        { error: "Only DJs can skip tracks" },
        { status: 403 }
      );
    }

    // Remove the first track from queue and add to played tracks
    if (targetSession.queue.length > 0) {
      const skippedTrack = targetSession.queue.shift();
      if (skippedTrack) {
        targetSession.playedTracks.push(skippedTrack.track.id);
      }

      // Normalize queue positions and stable flags
      targetSession.queue = normalizeQueue(targetSession.queue);
    }

    // Clear skip votes for the current track
    targetSession.votes.skip = [];
    targetSession.updatedAt = Date.now();
    await store.set(sessionId, targetSession);

    // Check if queue needs repopulation
    await checkAndRepopulateQueue(targetSession, store, session.accessToken);

    // Get the updated session to broadcast the potentially repopulated queue
    const updatedSession = await store.get(sessionId);

    // Skip to next track
    const spotifyService = new SpotifyService(session.accessToken);
    await spotifyService.skipToNext(deviceId || targetSession.activeDeviceId);

    // Get current playback state and broadcast to all session participants
    const playbackState = await spotifyService.getPlaybackState();
    broadcastToSession(sessionId, "playback_state_changed", playbackState as PlaybackState);

    // Broadcast queue update (includes skip vote reset and potential repopulation)
    if (updatedSession) {
      broadcastToSession(sessionId, "queue_updated", updatedSession.queue);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error skipping track:", error);

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
