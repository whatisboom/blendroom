import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { broadcastToSession } from "@/lib/websocket/server";
import { WS_EVENTS } from "@/lib/websocket/events";
import { z } from "zod";

const manageDJSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["add", "remove"]),
});

/**
 * POST /api/session/[id]/djs
 * Manage DJ privileges (host only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Parse and validate request body
    const body = await req.json();
    const validation = manageDJSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId, action } = validation.data;

    // Create session service
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);

    // Manage DJ
    const updatedSession = await sessionService.manageDJ(
      id,
      session.user.id,
      userId,
      action
    );

    // Broadcast DJ change event
    if (action === "add") {
      broadcastToSession(id, WS_EVENTS.DJ_ASSIGNED, userId);
    } else {
      broadcastToSession(id, WS_EVENTS.DJ_REMOVED, userId);
    }

    return NextResponse.json({
      session: {
        id: updatedSession.id,
        djs: updatedSession.djs,
        participants: updatedSession.participants,
      },
    });
  } catch (error) {
    console.error("Error managing DJ:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes("Only the host") ? 403 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
