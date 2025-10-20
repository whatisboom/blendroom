import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { broadcastToSession } from "@/lib/websocket/server";
import { z } from "zod";
import type { QueueItem } from "@/types";

const addTrackSchema = z.object({
  trackId: z.string().min(1),
});

/**
 * POST /api/queue/[sessionId]/add
 * Add a track to the queue (DJ only)
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

    // Parse and validate request body
    const body = await req.json();
    const validation = addTrackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { trackId } = validation.data;

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
        { error: "Only DJs can add tracks" },
        { status: 403 }
      );
    }

    // Fetch track details from Spotify (search by ID to get full track object)
    const spotifyService = new SpotifyService(session.accessToken);
    const searchResults = await spotifyService.searchTracks(`track:${trackId}`, 1);

    if (searchResults.length === 0) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    const track = searchResults[0];

    // Create queue item
    const queueItem: QueueItem = {
      track: {
        id: track.id,
        name: track.name,
        uri: track.uri,
        duration_ms: track.duration_ms,
        artists: track.artists,
        album: track.album,
        preview_url: track.preview_url,
        external_urls: track.external_urls,
      },
      position: targetSession.queue.length,
      addedBy: session.user.id,
      addedAt: Date.now(),
      isStable: false,
    };

    // Add to queue
    targetSession.queue.push(queueItem);
    targetSession.updatedAt = Date.now();

    await store.set(sessionId, targetSession);

    // Broadcast queue update to all session participants
    broadcastToSession(sessionId, "queue_updated", targetSession.queue);

    return NextResponse.json({
      queue: targetSession.queue,
      added: queueItem,
    });
  } catch (error) {
    console.error("Error adding track to queue:", error);

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
