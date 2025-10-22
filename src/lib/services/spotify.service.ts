import { createSpotifyClient, spotifyRateLimiter } from "@/lib/utils/spotify-client";
import type { SpotifyTrack, AudioFeatures, SpotifyArtist, Track, SpotifyDevice, PlaybackState } from "@/types";

/**
 * Options for play method
 */
interface PlayOptions {
  device_id?: string;
  uris?: string[];
  position_ms?: number;
}

/**
 * Options for pause method
 */
interface PauseOptions {
  device_id?: string;
}

/**
 * Options for skip method
 */
interface SkipOptions {
  device_id?: string;
}

/**
 * Options for add to queue method
 */
interface AddToQueueOptions {
  uri: string;
  device_id?: string;
}

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
      const items = response.body.items;
      if (!Array.isArray(items)) {
        return [];
      }
      return items;
    });
  }

  /**
   * Get user's top artists
   */
  async getUserTopArtists(limit = 50, timeRange: "short_term" | "medium_term" | "long_term" = "medium_term"): Promise<SpotifyArtist[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getMyTopArtists({ limit, time_range: timeRange });
      const items = response.body.items;
      if (!Array.isArray(items)) {
        return [];
      }
      return items;
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
      const items = response.body.tracks?.items;
      if (!Array.isArray(items)) {
        return [];
      }
      return items;
    });
  }

  /**
   * Search for tracks by artist ID
   */
  async searchTracksByArtist(artistId: string, limit = 20): Promise<Track[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getArtistTopTracks(artistId, "US");
      const tracks = response.body.tracks;
      if (!Array.isArray(tracks)) {
        return [];
      }
      return tracks.slice(0, limit);
    });
  }

  /**
   * Search for tracks by genre using search query
   */
  async searchTracksByGenre(genre: string, limit = 20): Promise<Track[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const query = `genre:"${genre}"`;
      const response = await client.searchTracks(query, { limit });
      const items = response.body.tracks?.items;
      if (!Array.isArray(items)) {
        return [];
      }
      return items;
    });
  }

  /**
   * Get available devices
   */
  async getDevices(): Promise<SpotifyDevice[]> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getMyDevices();
      const devices = response.body.devices;
      if (!Array.isArray(devices)) {
        return [];
      }
      return devices;
    });
  }

  /**
   * Start/resume playback
   */
  async play(deviceId?: string, uris?: string[], positionMs = 0): Promise<void> {
    return spotifyRateLimiter.execute(async () => {
      const client = createSpotifyClient(this.accessToken);
      const options: PlayOptions = {};
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
      const options: PauseOptions = {};
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
      const options: SkipOptions = {};
      if (deviceId) options.device_id = deviceId;
      await client.skipToNext(options);
    });
  }

  /**
   * Get current playback state
   */
  async getPlaybackState(): Promise<PlaybackState> {
    return spotifyRateLimiter.execute<PlaybackState>(async () => {
      const client = createSpotifyClient(this.accessToken);
      const response = await client.getMyCurrentPlaybackState();
      const body = response.body;

      return {
        is_playing: body.is_playing ?? false,
        progress_ms: body.progress_ms ?? 0,
        item: body.item ?? null,
        device: body.device ?? {
          id: '',
          is_active: false,
          is_private_session: false,
          is_restricted: false,
          name: '',
          type: '',
          volume_percent: 0
        },
        shuffle_state: body.shuffle_state ?? false,
        repeat_state: body.repeat_state ?? 'off',
      };
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
      const options: AddToQueueOptions = { uri: trackUri };
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
