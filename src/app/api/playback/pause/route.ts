import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { z } from "zod";

const pauseSchema = z.object({
  sessionId: z.string().min(1),
  deviceId: z.string().optional(),
});

/**
 * POST /api/playback/pause
 * Pause playback (host/DJ only)
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
    const validation = pauseSchema.safeParse(body);

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
        { error: "Only DJs can control playback" },
        { status: 403 }
      );
    }

    // Pause playback
    const spotifyService = new SpotifyService(session.accessToken);
    await spotifyService.pause(deviceId || targetSession.activeDeviceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error pausing playback:", error);

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
