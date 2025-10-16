import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { checkAndRepopulateQueue } from "@/lib/queue-auto-repopulate";
import { z } from "zod";

const playFromQueueSchema = z.object({
  sessionId: z.string().min(1),
  position: z.number().min(0),
  deviceId: z.string().optional(),
});

/**
 * POST /api/playback/play-from-queue
 * Play from a specific position in the queue (host/DJ only)
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
    const validation = playFromQueueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionId, position, deviceId } = validation.data;

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
        { error: "Only DJs can control playback" },
        { status: 403 }
      );
    }

    // Check if position is valid
    if (position >= targetSession.queue.length) {
      return NextResponse.json(
        { error: "Invalid queue position" },
        { status: 400 }
      );
    }

    // Get track URIs from the selected position onwards
    const trackUris = targetSession.queue
      .slice(position)
      .map((item) => `spotify:track:${item.track.id}`);

    // Start playback from the selected position
    const spotifyService = new SpotifyService(session.accessToken);
    await spotifyService.play(
      deviceId || targetSession.activeDeviceId,
      trackUris,
      0
    );

    // Remove all tracks from 0 to position (inclusive) and add to played tracks
    const removedTracks = targetSession.queue.splice(0, position + 1);
    removedTracks.forEach((item) => {
      targetSession.playedTracks.push(item.track.id);
    });

    targetSession.updatedAt = Date.now();
    await store.set(sessionId, targetSession);

    // Check if queue needs repopulation
    await checkAndRepopulateQueue(targetSession, store, session.accessToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error playing from queue:", error);

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
