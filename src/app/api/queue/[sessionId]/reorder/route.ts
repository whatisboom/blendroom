import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { broadcastToSession } from "@/lib/websocket/server";
import { normalizeQueue } from "@/lib/utils/queue";
import { z } from "zod";

const reorderQueueSchema = z.object({
  fromIndex: z.number().int().min(0),
  toIndex: z.number().int().min(0),
});

/**
 * PUT /api/queue/[sessionId]/reorder
 * Reorder queue (DJ only)
 */
export async function PUT(
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
    const validation = reorderQueueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { fromIndex, toIndex } = validation.data;

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
        { error: "Only DJs can reorder the queue" },
        { status: 403 }
      );
    }

    // Validate indices
    if (fromIndex >= targetSession.queue.length || toIndex >= targetSession.queue.length) {
      return NextResponse.json(
        { error: "Invalid queue indices" },
        { status: 400 }
      );
    }

    // Don't allow reordering stable tracks (first 3) UNLESS user is session owner
    const isSessionOwner = targetSession.hostId === session.user.id;
    if (!isSessionOwner && (fromIndex < 3 || toIndex < 3)) {
      return NextResponse.json(
        { error: "Cannot reorder stable tracks (first 3 in queue)" },
        { status: 400 }
      );
    }

    // Perform reorder
    const [removed] = targetSession.queue.splice(fromIndex, 1);
    targetSession.queue.splice(toIndex, 0, removed);

    // Normalize queue to ensure first 3 tracks are always stable and positions are correct
    targetSession.queue = normalizeQueue(targetSession.queue);

    targetSession.updatedAt = Date.now();

    await store.set(sessionId, targetSession);

    // Broadcast queue update to all session participants
    broadcastToSession(sessionId, "queue_updated", targetSession.queue);

    return NextResponse.json({ queue: targetSession.queue });
  } catch (error) {
    console.error("Error reordering queue:", error);

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
