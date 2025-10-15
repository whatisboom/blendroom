import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { broadcastToSession } from "@/lib/websocket/server";
import { triggerBackgroundRegeneration, cancelPendingRegeneration } from "@/lib/queue-background-regen";
import { z } from "zod";

const leaveSessionSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * POST /api/session/leave
 * Leave a session
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
    const validation = leaveSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionId } = validation.data;

    // Create session service
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);

    // Leave session
    await sessionService.leaveSession(sessionId, session.user.id);

    // Broadcast participant left event
    broadcastToSession(sessionId, "participant_left", session.user.id);

    // Check if session still exists (has participants)
    const updatedSession = await store.get(sessionId);

    if (updatedSession && updatedSession.participants.length > 0) {
      // Trigger background queue regeneration
      triggerBackgroundRegeneration(sessionId, store, session.accessToken);
    } else {
      // Session was deleted (no participants left), cancel any pending regeneration
      cancelPendingRegeneration(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving session:", error);

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
