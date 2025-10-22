import { type NextAuthOptions } from "next-auth";
import { type JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";

/**
 * Spotify scopes needed for the app:
 * - user-read-email: Read user email
 * - user-read-private: Read user profile
 * - user-top-read: Get user's top tracks and artists
 * - user-read-playback-state: Read playback state
 * - user-modify-playback-state: Control playback
 * - streaming: Web Playback SDK
 */
const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-playback-state",
  "user-modify-playback-state",
  "streaming",
  "user-read-currently-playing",
].join(" ");

// Validate required environment variables at module load
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  throw new Error('Missing required Spotify credentials in environment variables');
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: SPOTIFY_CLIENT_ID,
      clientSecret: SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          spotifyId: profile.id,
        };
      }

      // Return previous token if the access token has not expired yet
      if (typeof token.accessTokenExpires === 'number' && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to refresh it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Send properties to the client
      session.user.id = typeof token.sub === 'string' ? token.sub : '';
      session.user.spotifyId = typeof token.spotifyId === 'string' ? token.spotifyId : '';
      session.accessToken = typeof token.accessToken === 'string' ? token.accessToken : '';
      session.error = typeof token.error === 'string' ? token.error : undefined;

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

/**
 * Refresh the Spotify access token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (typeof token.refreshToken !== 'string') {
      throw new Error('No refresh token available');
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
