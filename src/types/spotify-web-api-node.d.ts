declare module "spotify-web-api-node" {
  export default class SpotifyWebApi {
    constructor(credentials?: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    });

    setAccessToken(accessToken: string): void;
    setRefreshToken(refreshToken: string): void;
    resetAccessToken(): void;
    resetRefreshToken(): void;
    getAccessToken(): string | undefined;
    getRefreshToken(): string | undefined;

    // User methods
    getMe(): Promise<{ body: SpotifyApi.CurrentUsersProfileResponse }>;

    // Top items
    getMyTopTracks(options?: {
      limit?: number;
      offset?: number;
      time_range?: "short_term" | "medium_term" | "long_term";
    }): Promise<{ body: SpotifyApi.UsersTopTracksResponse }>;

    getMyTopArtists(options?: {
      limit?: number;
      offset?: number;
      time_range?: "short_term" | "medium_term" | "long_term";
    }): Promise<{ body: SpotifyApi.UsersTopArtistsResponse }>;

    // Playback
    getMyCurrentPlaybackState(options?: {
      market?: string;
    }): Promise<{ body: SpotifyApi.CurrentPlaybackResponse }>;

    getMyDevices(): Promise<{ body: SpotifyApi.UserDevicesResponse }>;

    transferMyPlayback(
      deviceIds: string[],
      options?: { play?: boolean }
    ): Promise<{ body: Record<string, never> }>;

    play(options?: {
      device_id?: string;
      context_uri?: string;
      uris?: string[];
      offset?: { position?: number; uri?: string };
      position_ms?: number;
    }): Promise<{ body: Record<string, never> }>;

    pause(options?: { device_id?: string }): Promise<{ body: Record<string, never> }>;

    skipToNext(options?: { device_id?: string }): Promise<{ body: Record<string, never> }>;

    skipToPrevious(options?: { device_id?: string }): Promise<{ body: Record<string, never> }>;

    seek(
      positionMs: number,
      options?: { device_id?: string }
    ): Promise<{ body: Record<string, never> }>;

    // Search
    searchTracks(
      query: string,
      options?: { limit?: number; offset?: number; market?: string }
    ): Promise<{ body: SpotifyApi.TrackSearchResponse }>;

    // Recommendations
    getRecommendations(options: {
      seed_artists?: string[];
      seed_genres?: string[];
      seed_tracks?: string[];
      limit?: number;
      market?: string;
      min_acousticness?: number;
      max_acousticness?: number;
      target_acousticness?: number;
      min_danceability?: number;
      max_danceability?: number;
      target_danceability?: number;
      min_duration_ms?: number;
      max_duration_ms?: number;
      target_duration_ms?: number;
      min_energy?: number;
      max_energy?: number;
      target_energy?: number;
      min_instrumentalness?: number;
      max_instrumentalness?: number;
      target_instrumentalness?: number;
      min_key?: number;
      max_key?: number;
      target_key?: number;
      min_liveness?: number;
      max_liveness?: number;
      target_liveness?: number;
      min_loudness?: number;
      max_loudness?: number;
      target_loudness?: number;
      min_mode?: number;
      max_mode?: number;
      target_mode?: number;
      min_popularity?: number;
      max_popularity?: number;
      target_popularity?: number;
      min_speechiness?: number;
      max_speechiness?: number;
      target_speechiness?: number;
      min_tempo?: number;
      max_tempo?: number;
      target_tempo?: number;
      min_time_signature?: number;
      max_time_signature?: number;
      target_time_signature?: number;
      min_valence?: number;
      max_valence?: number;
      target_valence?: number;
    }): Promise<{ body: SpotifyApi.RecommendationsFromSeedsResponse }>;

    // Audio features
    getAudioFeaturesForTracks(
      trackIds: string[]
    ): Promise<{ body: SpotifyApi.MultipleAudioFeaturesResponse }>;

    // Artist methods
    getArtistTopTracks(
      artistId: string,
      country: string
    ): Promise<{ body: { tracks: SpotifyApi.TrackObjectFull[] } }>;

    // Queue methods
    addToQueue(
      trackUri: string,
      options?: { device_id?: string }
    ): Promise<{ body: Record<string, never> }>;
  }
}
