import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { z } from "zod";

const voteLikeSchema = z.object({
  sessionId: z.string().min(1),
  trackId: z.string().min(1),
});

/**
 * POST /api/vote/like
 * Like the current track (influences future queue generation)
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
    const validation = voteLikeSchema.safeParse(body);

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

    // Check if user already liked this track
    const existingLike = targetSession.votes.like.find(
      (v) => v.userId === session.user.id && v.trackId === trackId
    );

    if (existingLike) {
      // Unlike - remove the vote
      targetSession.votes.like = targetSession.votes.like.filter(
        (v) => !(v.userId === session.user.id && v.trackId === trackId)
      );

      targetSession.updatedAt = Date.now();
      await store.set(sessionId, targetSession);

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: targetSession.votes.like.filter((v) => v.trackId === trackId)
          .length,
      });
    }

    // Add like
    targetSession.votes.like.push({
      userId: session.user.id,
      trackId,
      timestamp: Date.now(),
    });

    targetSession.updatedAt = Date.now();
    await store.set(sessionId, targetSession);

    // Count likes for this track
    const likeCount = targetSession.votes.like.filter(
      (v) => v.trackId === trackId
    ).length;

    return NextResponse.json({
      success: true,
      liked: true,
      likeCount,
    });
  } catch (error) {
    console.error("Error liking track:", error);

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
