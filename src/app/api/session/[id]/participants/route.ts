import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";

/**
 * GET /api/session/[id]/participants
 * Get list of participants in a session
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

    // Return participants list
    return NextResponse.json({
      participants: targetSession.participants,
      count: targetSession.participants.length,
      host: targetSession.participants.find((p) => p.isHost),
      djs: targetSession.participants.filter((p) => p.isDJ),
    });
  } catch (error) {
    console.error("Error getting participants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
