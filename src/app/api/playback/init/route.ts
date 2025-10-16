import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getStore } from "@/lib/session";
import { SessionService } from "@/lib/services/session.service";
import { SpotifyService } from "@/lib/services/spotify.service";
import { z } from "zod";

const initSchema = z.object({
  sessionId: z.string().min(1),
  playbackMode: z.enum(["device", "web"]),
  deviceId: z.string().optional(),
});

/**
 * POST /api/playback/init
 * Initialize playback for a session (host/DJ only)
 * Sets up device or Web Playback SDK for the session
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
    const validation = initSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionId, playbackMode, deviceId } = validation.data;

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
        { error: "Only DJs can initialize playback" },
        { status: 403 }
      );
    }

    const spotifyService = new SpotifyService(session.accessToken);

    // Handle device mode
    if (playbackMode === "device") {
      // Get available devices
      const devices = await spotifyService.getDevices();

      if (devices.length === 0) {
        return NextResponse.json(
          { error: "No active Spotify devices found. Please open Spotify on a device first." },
          { status: 400 }
        );
      }

      // Use provided deviceId or the first active device
      const selectedDevice = deviceId
        ? devices.find((d) => d.id === deviceId)
        : devices.find((d) => d.is_active) || devices[0];

      if (!selectedDevice) {
        return NextResponse.json(
          { error: "Selected device not found" },
          { status: 404 }
        );
      }

      // Update session with active device
      targetSession.activeDeviceId = selectedDevice.id;
      targetSession.activeDeviceName = selectedDevice.name;
      targetSession.activeDeviceType = selectedDevice.type;
      targetSession.settings.playbackMode = "device";
      await store.set(sessionId, targetSession);

      return NextResponse.json({
        success: true,
        playbackMode: "device",
        device: {
          id: selectedDevice.id,
          name: selectedDevice.name,
          type: selectedDevice.type,
        },
        availableDevices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          isActive: d.is_active,
        })),
      });
    }

    // Handle web mode - return token for Web Playback SDK
    if (playbackMode === "web") {
      targetSession.settings.playbackMode = "web";
      await store.set(sessionId, targetSession);

      return NextResponse.json({
        success: true,
        playbackMode: "web",
        accessToken: session.accessToken, // Frontend needs this for Web Playback SDK
      });
    }

    return NextResponse.json(
      { error: "Invalid playback mode" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error initializing playback:", error);

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
