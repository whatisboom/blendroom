import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { z } from "zod";

const createSessionSchema = z.object({
  customCode: z.string().min(4).max(12).optional(),
  settings: z.object({
    voteToSkip: z.boolean().optional(),
    skipThreshold: z.number().int().min(1).optional(),
    playbackMode: z.enum(["device", "web"]).optional(),
  }).optional(),
});

/**
 * POST /api/session/create
 * Create a new session
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
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { customCode, settings } = validation.data;

    // Create session service
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);

    // Create session
    const newSession = await sessionService.createSession(
      session.user.id,
      session.user.name || "Unknown",
      {
        customCode,
        settings,
      }
    );

    return NextResponse.json({
      session: {
        id: newSession.id,
        code: newSession.code,
        hostId: newSession.hostId,
        participants: newSession.participants,
        djs: newSession.djs,
        settings: newSession.settings,
        createdAt: newSession.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating session:", error);

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
