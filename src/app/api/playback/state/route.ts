import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { SpotifyService } from "@/lib/services/spotify.service";

/**
 * GET /api/playback/state
 * Get current playback state
 */
export async function GET(_req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get playback state
    const spotifyService = new SpotifyService(session.accessToken);
    const state = await spotifyService.getPlaybackState();

    return NextResponse.json({ state });
  } catch (error) {
    console.error("Error getting playback state:", error);

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
