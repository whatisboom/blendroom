import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";

/**
 * GET /api/session/[id]
 * Get session details
 */
export async function GET(
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

    // Create session service
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);

    // Get session
    const targetSession = await sessionService.getSession(id);

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

    return NextResponse.json({ session: targetSession });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/session/[id]
 * Delete a session (host only)
 */
export async function DELETE(
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

    // Create session service
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);

    // Delete session
    await sessionService.deleteSession(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);

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
