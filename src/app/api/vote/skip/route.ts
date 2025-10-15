import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { z } from "zod";

const voteSkipSchema = z.object({
  sessionId: z.string().min(1),
  trackId: z.string().min(1),
});

/**
 * POST /api/vote/skip
 * Vote to skip the current track
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
    const validation = voteSkipSchema.safeParse(body);

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

    // Check if user is in session
    if (!sessionService.isParticipant(targetSession, session.user.id)) {
      return NextResponse.json(
        { error: "Not a participant of this session" },
        { status: 403 }
      );
    }

    // Check if vote to skip is enabled
    if (!targetSession.settings.voteToSkip) {
      return NextResponse.json(
        { error: "Vote to skip is disabled for this session" },
        { status: 400 }
      );
    }

    // Check if user already voted
    const existingVote = targetSession.votes.skip.find(
      (v) => v.userId === session.user.id && v.trackId === trackId
    );

    if (existingVote) {
      return NextResponse.json(
        { error: "Already voted to skip this track" },
        { status: 400 }
      );
    }

    // Add vote
    targetSession.votes.skip.push({
      userId: session.user.id,
      trackId,
      timestamp: Date.now(),
    });

    // Count votes for this track
    const voteCount = targetSession.votes.skip.filter(
      (v) => v.trackId === trackId
    ).length;

    // Check if threshold reached
    const thresholdReached = voteCount >= targetSession.settings.skipThreshold;

    if (thresholdReached) {
      // Clear skip votes for this track
      targetSession.votes.skip = targetSession.votes.skip.filter(
        (v) => v.trackId !== trackId
      );

      // Skip to next track
      const spotifyService = new SpotifyService(session.accessToken);
      await spotifyService.skipToNext(targetSession.activeDeviceId);

      targetSession.updatedAt = Date.now();
      await store.set(sessionId, targetSession);

      return NextResponse.json({
        success: true,
        skipped: true,
        voteCount,
        threshold: targetSession.settings.skipThreshold,
      });
    }

    targetSession.updatedAt = Date.now();
    await store.set(sessionId, targetSession);

    return NextResponse.json({
      success: true,
      skipped: false,
      voteCount,
      threshold: targetSession.settings.skipThreshold,
    });
  } catch (error) {
    console.error("Error voting to skip:", error);

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
