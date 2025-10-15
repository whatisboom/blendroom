import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { SpotifyService } from "@/lib/services/spotify.service";

/**
 * GET /api/test/spotify
 * Test Spotify API access and permissions
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated", hasSession: false },
        { status: 401 }
      );
    }

    const result: Record<string, unknown> = {
      hasSession: true,
      user: {
        id: session.user?.id,
        name: session.user?.name,
        email: session.user?.email,
      },
      hasAccessToken: !!session.accessToken,
      accessTokenPreview: session.accessToken
        ? `${session.accessToken.substring(0, 20)}...`
        : null,
      error: session.error,
    };

    // Try to fetch user's top tracks
    if (session.accessToken) {
      const spotifyService = new SpotifyService(session.accessToken);

      try {
        const topTracks = await spotifyService.getUserTopTracks(5, "short_term");
        result.topTracksSuccess = true;
        result.topTracksCount = topTracks.length;
        result.topTrackNames = topTracks.map(t => t.name);
      } catch (error) {
        result.topTracksSuccess = false;
        result.topTracksError = {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown',
          // @ts-expect-error - accessing error properties
          statusCode: error?.statusCode,
          // @ts-expect-error - accessing error properties
          body: error?.body,
        };
      }

      // Try to fetch user's top artists
      try {
        const topArtists = await spotifyService.getUserTopArtists(5, "short_term");
        result.topArtistsSuccess = true;
        result.topArtistsCount = topArtists.length;
        result.topArtistNames = topArtists.map(a => a.name);
      } catch (error) {
        result.topArtistsSuccess = false;
        result.topArtistsError = {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown',
          // @ts-expect-error - accessing error properties
          statusCode: error?.statusCode,
          // @ts-expect-error - accessing error properties
          body: error?.body,
        };
      }

      // Try to get playback state
      try {
        const playbackState = await spotifyService.getPlaybackState();
        result.playbackStateSuccess = true;
        result.hasActiveDevice = !!playbackState;
      } catch (error) {
        result.playbackStateSuccess = false;
        result.playbackStateError = {
          message: error instanceof Error ? error.message : String(error),
          // @ts-expect-error - accessing error properties
          statusCode: error?.statusCode,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing Spotify API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
