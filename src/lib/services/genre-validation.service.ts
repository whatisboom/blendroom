import type { SessionStore } from "@/lib/session-store/types";
import { SpotifyService } from "./spotify.service";

const GENRE_CACHE_KEY = "spotify:available-genres";
const GENRE_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Service for validating Spotify genre seeds
 * Caches the list of available genres in Redis to avoid repeated API calls
 */
export class GenreValidationService {
  private store: SessionStore;
  private spotifyService: SpotifyService;

  constructor(store: SessionStore, accessToken: string) {
    this.store = store;
    this.spotifyService = new SpotifyService(accessToken);
  }

  /**
   * Get available genre seeds from cache or Spotify API
   */
  async getAvailableGenres(): Promise<Set<string>> {
    // Try to get from cache first
    const cached = await this.store.get<string[]>(GENRE_CACHE_KEY);

    if (cached) {
      console.log(`Using cached genre list (${cached.length} genres)`);
      return new Set(cached);
    }

    // Fetch from Spotify API
    console.log("Fetching available genre seeds from Spotify...");
    const genres = await this.spotifyService.getAvailableGenreSeeds();
    console.log(`Fetched ${genres.length} available genre seeds from Spotify`);

    // Cache the result
    await this.store.set(GENRE_CACHE_KEY, genres, GENRE_CACHE_TTL);

    return new Set(genres);
  }

  /**
   * Validate and filter genres to only include valid Spotify genre seeds
   * Also normalizes genre names (lowercase, hyphens instead of spaces)
   */
  async validateGenres(genres: string[]): Promise<string[]> {
    const availableGenres = await this.getAvailableGenres();

    const validGenres: string[] = [];
    const invalidGenres: string[] = [];

    for (const genre of genres) {
      // Normalize the genre name
      const normalized = this.normalizeGenre(genre);

      // Check if it's in the available list
      if (availableGenres.has(normalized)) {
        validGenres.push(normalized);
      } else {
        invalidGenres.push(genre);
      }
    }

    if (invalidGenres.length > 0) {
      console.log(`Invalid genre seeds filtered out:`, invalidGenres);
    }

    if (validGenres.length > 0) {
      console.log(`Valid genre seeds:`, validGenres);
    }

    return validGenres;
  }

  /**
   * Normalize genre name for Spotify API
   * Spotify genre seeds must be lowercase with hyphens instead of spaces
   */
  private normalizeGenre(genre: string): string {
    return genre
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }
}
