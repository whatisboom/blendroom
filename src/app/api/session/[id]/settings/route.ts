import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { broadcastToSession } from "@/lib/websocket/server";
import { z } from "zod";

const updateSettingsSchema = z.object({
  voteToSkip: z.boolean().optional(),
  skipThreshold: z.number().int().min(1).optional(),
  playbackMode: z.enum(["device", "web"]).optional(),
});

/**
 * PUT /api/session/[id]/settings
 * Update session settings (host only)
 */
export async function PUT(
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
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Create session service
    const store = getStore();
    const sessionService = new SessionService(store, session.accessToken);

    // Update settings
    const updatedSession = await sessionService.updateSettings(
      id,
      session.user.id,
      validation.data
    );

    // Broadcast settings update to all participants
    broadcastToSession(id, WS_EVENTS.SESSION_SETTINGS_UPDATED, updatedSession.settings);

    return NextResponse.json({
      session: {
        id: updatedSession.id,
        settings: updatedSession.settings,
      },
    });
  } catch (error) {
    console.error("Error updating session settings:", error);

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
