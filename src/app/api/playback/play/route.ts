import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { broadcastToSession } from "@/lib/websocket/server";
import { PlaybackState } from "@/types/spotify";
import { z } from "zod";

const playSchema = z.object({
  sessionId: z.string().min(1),
  deviceId: z.string().optional(),
});

/**
 * POST /api/playback/play
 * Start/resume playback (host/DJ only)
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
    const validation = playSchema.safeParse(body);

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

    // Check if queue has tracks
    if (targetSession.queue.length === 0) {
      return NextResponse.json(
        { error: "Queue is empty" },
        { status: 400 }
      );
    }

    // Get track URIs from queue
    const trackUris = targetSession.queue.map(
      (item) => `spotify:track:${item.track.id}`
    );

    // Start playback
    const spotifyService = new SpotifyService(session.accessToken);
    await spotifyService.play(
      deviceId || targetSession.activeDeviceId,
      trackUris,
      0
    );

    // Remove the first track from queue and add to played tracks
    const nowPlaying = targetSession.queue.shift();
    if (nowPlaying) {
      targetSession.playedTracks.push(nowPlaying.track.id);
      targetSession.updatedAt = Date.now();
      await store.set(sessionId, targetSession);
    }

    // Get current playback state and broadcast to all session participants
    const playbackState = await spotifyService.getPlaybackState();
    broadcastToSession(sessionId, "playback_state_changed", playbackState as PlaybackState);

    // Also broadcast queue update since we removed the first track
    broadcastToSession(sessionId, "queue_updated", targetSession.queue);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error starting playback:", error);

    // Handle Spotify API errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const spotifyError = error as { statusCode?: number; body?: { error?: { message?: string } } };

      // 404 typically means no active device found
      if (spotifyError.statusCode === 404) {
        return NextResponse.json(
          {
            error: "No active Spotify device found. Please open Spotify on a device and start playing, then try again.",
            details: "Make sure you have Spotify Premium and an active device."
          },
          { status: 404 }
        );
      }

      const errorMessage = spotifyError.body?.error?.message || "Spotify API error";
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
