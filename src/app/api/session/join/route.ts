import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { z } from "zod";

const joinSessionSchema = z.object({
  code: z.string().min(1),
});

/**
 * POST /api/session/join
 * Join an existing session
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
    const validation = joinSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // Create session service
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);

    // Join session
    const joinedSession = await sessionService.joinSession(
      code.toUpperCase(),
      session.user.id,
      session.user.name || "Unknown"
    );

    return NextResponse.json({
      session: {
        id: joinedSession.id,
        code: joinedSession.code,
        hostId: joinedSession.hostId,
        participants: joinedSession.participants,
        djs: joinedSession.djs,
        settings: joinedSession.settings,
      },
    });
  } catch (error) {
    console.error("Error joining session:", error);

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
