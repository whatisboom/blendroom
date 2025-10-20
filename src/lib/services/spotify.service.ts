import { createSpotifyClient, spotifyRateLimiter } from "@/lib/utils/spotify-client";
import type { SpotifyTrack, AudioFeatures, SpotifyArtist, Track, SpotifyDevice } from "@/types";

/**
 * Spotify service for interacting with the Spotify Web API
 */
export class SpotifyService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get user's top tracks
   */
  async getUserTopTracks(limit = 50, timeRange: "short_term" | "medium_term" | "long_term" = "medium_term"): Promise<SpotifyTrack[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getMyTopTracks({ limit, time_range: timeRange });
      return response.body.items as SpotifyTrack[];
    });
  }

  /**
   * Get user's top artists
   */
  async getUserTopArtists(limit = 50, timeRange: "short_term" | "medium_term" | "long_term" = "medium_term"): Promise<SpotifyArtist[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getMyTopArtists({ limit, time_range: timeRange });
      return response.body.items as SpotifyArtist[];
    });
  }

  /**
   * Get audio features for multiple tracks
   */
  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    // Spotify API limit: 100 tracks per request
    const chunks = this.chunkArray(trackIds, 100);
    const allFeatures: AudioFeatures[] = [];

    console.log(`Getting audio features for ${trackIds.length} tracks in ${chunks.length} chunks`);

    for (const chunk of chunks) {
      try {
        const features = await spotifyRateLimiter.execute(async () => {
          const client = createSpotifyClient(this.accessToken);
          console.log(`Fetching audio features for chunk of ${chunk.length} tracks`);
          const response = await client.getAudioFeaturesForTracks(chunk);
          console.log(`Successfully fetched audio features for ${chunk.length} tracks`);
          return response.body.audio_features.filter((f: AudioFeatures | null): f is AudioFeatures => f !== null);
        });
        allFeatures.push(...features);
      } catch (error) {
        console.error(`Error fetching audio features for chunk:`, error);
        // Log track IDs for debugging
        console.error(`Track IDs that failed:`, chunk);
        throw error;
      }
    }

    console.log(`Successfully retrieved ${allFeatures.length} audio features`);
    return allFeatures;
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.searchTracks(query, { limit });
      return response.body.tracks?.items as SpotifyTrack[] || [];
    });
  }

  /**
   * Search for tracks by artist ID
   */
  async searchTracksByArtist(artistId: string, limit = 20): Promise<Track[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);

      // Get artist's top tracks
      const response = await client.getArtistTopTracks(artistId, "US");

      // Return up to limit tracks
      return (response.body.tracks as Track[]).slice(0, limit);
    });
  }

  /**
   * Search for tracks by genre using search query
   */
  async searchTracksByGenre(genre: string, limit = 20): Promise<Track[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);

      // Use genre as a search query
      const query = `genre:"${genre}"`;
      const response = await client.searchTracks(query, { limit });

      return (response.body.tracks?.items as Track[]) || [];
    });
  }

  /**
   * Get track recommendations based on seed artists, tracks, and genres
   * Spotify API allows up to 5 seeds total (combined artists + tracks + genres)
   */
  async getRecommendations(options: {
    seedArtists?: string[];
    seedTracks?: string[];
    seedGenres?: string[];
    limit?: number;
    targetEnergy?: number;
    targetValence?: number;
  }): Promise<Track[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);

      // Spotify API limit: 5 seeds total
      const seedArtists = (options.seedArtists || []).slice(0, 5);
      const seedTracks = (options.seedTracks || []).slice(0, 5);
      const seedGenres = (options.seedGenres || []).slice(0, 5);

      // Build options object
      const requestOptions: Record<string, unknown> = {
        limit: options.limit || 20,
      };

      if (seedArtists.length > 0) {
        requestOptions.seed_artists = seedArtists.join(',');
      }
      if (seedTracks.length > 0) {
        requestOptions.seed_tracks = seedTracks.join(',');
      }
      if (seedGenres.length > 0) {
        requestOptions.seed_genres = seedGenres.join(',');
      }
      if (options.targetEnergy !== undefined) {
        requestOptions.target_energy = options.targetEnergy;
      }
      if (options.targetValence !== undefined) {
        requestOptions.target_valence = options.targetValence;
      }

      console.log(`Fetching recommendations with seeds: ${seedArtists.length} artists, ${seedTracks.length} tracks, ${seedGenres.length} genres`);
      const response = await client.getRecommendations(requestOptions);
      console.log(`Received ${response.body.tracks.length} recommendations`);

      return response.body.tracks as Track[];
    });
  }

  /**
   * Get available devices
   */
  async getDevices(): Promise<SpotifyDevice[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getMyDevices();
      return response.body.devices as SpotifyDevice[];
    });
  }

  /**
   * Start/resume playback
   */
  async play(deviceId?: string, uris?: string[], positionMs = 0): Promise<void> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const options: Record<string, unknown> = {};
      if (deviceId) options.device_id = deviceId;
      if (uris) options.uris = uris;
      if (positionMs > 0) options.position_ms = positionMs;
      await client.play(options);
    });
  }

  /**
   * Pause playback
   */
  async pause(deviceId?: string): Promise<void> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const options: Record<string, unknown> = {};
      if (deviceId) options.device_id = deviceId;
      await client.pause(options);
    });
  }

  /**
   * Skip to next track
   */
  async skipToNext(deviceId?: string): Promise<void> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const options: Record<string, unknown> = {};
      if (deviceId) options.device_id = deviceId;
      await client.skipToNext(options);
    });
  }

  /**
   * Get current playback state
   */
  async getPlaybackState(): Promise<unknown> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getMyCurrentPlaybackState();
      return response.body;
    });
  }

  /**
   * Transfer playback to a specific device
   */
  async transferPlayback(deviceId: string, play = true): Promise<void> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      await client.transferMyPlayback([deviceId], { play });
    });
  }

  /**
   * Add tracks to queue
   */
  async addToQueue(trackUri: string, deviceId?: string): Promise<void> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const options: Record<string, unknown> = { uri: trackUri };
      if (deviceId) options.device_id = deviceId;
      await client.addToQueue(trackUri, options);
    });
  }

  /**
   * Helper: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
