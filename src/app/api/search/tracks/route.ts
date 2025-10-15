import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { SpotifyService } from "@/lib/services/spotify.service";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.number().min(1).max(50).optional(),
});

/**
 * GET /api/search/tracks
 * Search for tracks on Spotify
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query params
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = searchParams.get("limit");

    const validation = searchSchema.safeParse({
      q: query,
      limit: limit ? parseInt(limit) : undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { q, limit: searchLimit = 20 } = validation.data;

    // Search tracks
    const spotifyService = new SpotifyService(session.accessToken);
    const tracks = await spotifyService.searchTracks(q, searchLimit);

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Error searching tracks:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
