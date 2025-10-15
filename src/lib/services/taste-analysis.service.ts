import { SpotifyService } from "./spotify.service";
import type { TasteProfile, SpotifyArtist, Participant } from "@/types";

/**
 * Service for analyzing user music taste based on Spotify data
 */
export class TasteAnalysisService {
  private spotifyService: SpotifyService;
  private cache: Map<string, { profile: TasteProfile; timestamp: number }> = new Map();
  private readonly cacheTTL = 60 * 60 * 1000; // 1 hour

  constructor(accessToken: string) {
    this.spotifyService = new SpotifyService(accessToken);
  }

  /**
   * Analyze a user's taste profile
   */
  async analyzeUserTaste(userId: string): Promise<TasteProfile> {
    // Check cache
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`Using cached taste profile for user ${userId}`);
      return cached.profile;
    }

    console.log(`Fetching taste profile for user ${userId}...`);
    // Fetch user's top tracks and artists
    const [topTracks, topArtists] = await Promise.all([
      this.spotifyService.getUserTopTracks(50, "medium_term"),
      this.spotifyService.getUserTopArtists(50, "medium_term"),
    ]);
    console.log(`Successfully fetched ${topTracks.length} tracks and ${topArtists.length} artists for user ${userId}`);

    // Extract track IDs
    const trackIds = topTracks.map((t) => t.id);

    // Extract top genres from artists
    const topGenres = this.extractTopGenres(topArtists);

    const profile: TasteProfile = {
      userId,
      topTracks: trackIds,
      topArtists,
      topGenres,
      lastUpdated: Date.now(),
    };

    // Cache the profile
    this.cache.set(userId, { profile, timestamp: Date.now() });

    return profile;
  }

  /**
   * Find common artists between multiple users
   */
  findCommonArtists(profiles: TasteProfile[]): SpotifyArtist[] {
    if (profiles.length === 0) return [];
    if (profiles.length === 1) return profiles[0].topArtists;

    // Get artist IDs from first profile
    const firstArtistIds = new Set(profiles[0].topArtists.map((a) => a.id));

    // Find artists that appear in all profiles
    const commonArtistIds = new Set<string>();

    for (const artistId of firstArtistIds) {
      const appearsInAll = profiles.every((profile) =>
        profile.topArtists.some((a) => a.id === artistId)
      );

      if (appearsInAll) {
        commonArtistIds.add(artistId);
      }
    }

    // Return artist objects
    return profiles[0].topArtists.filter((a) => commonArtistIds.has(a.id));
  }

  /**
   * Find common genres between multiple users
   */
  findCommonGenres(profiles: TasteProfile[]): string[] {
    if (profiles.length === 0) return [];
    if (profiles.length === 1) return profiles[0].topGenres;

    // Count genre occurrences
    const genreCounts = new Map<string, number>();

    for (const profile of profiles) {
      const uniqueGenres = new Set(profile.topGenres);
      for (const genre of uniqueGenres) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      }
    }

    // Find genres that appear in at least 50% of profiles
    const threshold = Math.ceil(profiles.length / 2);
    const commonGenres: string[] = [];

    for (const [genre, count] of genreCounts.entries()) {
      if (count >= threshold) {
        commonGenres.push(genre);
      }
    }

    // Sort by count (descending)
    return commonGenres.sort(
      (a, b) => (genreCounts.get(b) || 0) - (genreCounts.get(a) || 0)
    );
  }

  /**
   * Generate a session profile by aggregating participant taste profiles
   */
  async generateSessionProfile(participants: Participant[]): Promise<{
    commonArtists: string[];
    commonGenres: string[];
    tasteProfiles: TasteProfile[];
  }> {
    console.log(`Generating session profile for ${participants.length} participants`);

    // Get taste profiles for all participants
    console.log(`Fetching taste profiles...`);
    const tasteProfiles = await Promise.all(
      participants.map((p) => this.analyzeUserTaste(p.userId))
    );
    console.log(`Successfully fetched ${tasteProfiles.length} taste profiles`);

    // Find common artists and genres
    console.log(`Finding common artists and genres...`);
    const commonArtistObjects = this.findCommonArtists(tasteProfiles);
    const commonArtists = commonArtistObjects.map((a) => a.id);
    const commonGenres = this.findCommonGenres(tasteProfiles);
    console.log(`Found ${commonArtists.length} common artists and ${commonGenres.length} common genres`);

    return {
      commonArtists,
      commonGenres,
      tasteProfiles,
    };
  }

  /**
   * Extract top genres from artists
   */
  private extractTopGenres(artists: SpotifyArtist[], limit = 10): string[] {
    const genreCounts = new Map<string, number>();

    // Count genre occurrences
    for (const artist of artists) {
      if (!artist.genres) continue;
      for (const genre of artist.genres) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      }
    }

    // Sort by count and return top N
    return Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([genre]) => genre);
  }

  /**
   * Clear cache for a specific user or all users
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }
}
