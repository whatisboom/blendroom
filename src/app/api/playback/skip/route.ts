import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { handleTrackCompletion } from "@/lib/utils/playback";
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

    // Clear skip votes for the current track
    targetSession.votes.skip = [];
    targetSession.updatedAt = Date.now();
    await store.set(sessionId, targetSession);

    // Skip to next track on Spotify
    const spotifyService = new SpotifyService(session.accessToken);
    await spotifyService.skipToNext(deviceId || targetSession.activeDeviceId);

    // Handle track completion (update queue, broadcast state)
    await handleTrackCompletion(sessionId, targetSession, store, session.accessToken);

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
