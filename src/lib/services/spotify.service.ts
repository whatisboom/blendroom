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

    for (const chunk of chunks) {
      const features = await spotifyRateLimiter.execute(async () => {
        const client = createSpotifyClient(this.accessToken);
        const response = await client.getAudioFeaturesForTracks(chunk);
        return response.body.audio_features.filter((f): f is AudioFeatures => f !== null);
      });
      allFeatures.push(...features);
    }

    return allFeatures;
  }

  /**
   * Get recommendations based on seed tracks, artists, and target audio features
   */
  async getRecommendations(params: {
    seedTracks?: string[];
    seedArtists?: string[];
    seedGenres?: string[];
    targetFeatures?: Partial<AudioFeatures>;
    limit?: number;
  }): Promise<Track[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);

      const options: Record<string, unknown> = {
        limit: params.limit || 50,
      };

      if (params.seedTracks) options.seed_tracks = params.seedTracks.slice(0, 5);
      if (params.seedArtists) options.seed_artists = params.seedArtists.slice(0, 5);
      if (params.seedGenres) options.seed_genres = params.seedGenres.slice(0, 5);

      // Add target audio features
      if (params.targetFeatures) {
        if (params.targetFeatures.danceability !== undefined) {
          options.target_danceability = params.targetFeatures.danceability;
        }
        if (params.targetFeatures.energy !== undefined) {
          options.target_energy = params.targetFeatures.energy;
        }
        if (params.targetFeatures.valence !== undefined) {
          options.target_valence = params.targetFeatures.valence;
        }
        if (params.targetFeatures.tempo !== undefined) {
          options.target_tempo = params.targetFeatures.tempo;
        }
      }

      const response = await client.getRecommendations(options);
      return response.body.tracks as Track[];
    });
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
