import { SpotifyService } from "./spotify.service";
import { scoreTracks, sortByScore } from "../algorithm/scoring";
import type { Session, Track, QueueItem, TasteProfile } from "@/types";

/**
 * Service for generating music queues based on session taste profile
 * Fetches top tracks from common artists and blends them using scoring algorithm
 */
export class QueueGenerationService {
  private spotifyService: SpotifyService;

  constructor(accessToken: string) {
    this.spotifyService = new SpotifyService(accessToken);
  }

  /**
   * Generate a queue for the session
   * Returns 10 tracks optimized for the group's taste
   */
  async generateQueue(
    session: Session,
    targetSize = 10
  ): Promise<QueueItem[]> {
    if (!session.profile) {
      throw new Error("Session profile not generated");
    }

    const { commonArtists, commonGenres, tasteProfiles } = session.profile;

    // 1. Get candidate tracks from Spotify recommendations
    const candidates = await this.getCandidateTracks(
      commonArtists,
      commonGenres,
      tasteProfiles,
      targetSize * 2 // Get 2x candidates for selection (reduced from 3x for efficiency)
    );

    // 2. Remove duplicates (already in queue, played recently, or already played)
    const existingTrackIds = new Set(session.queue.map((q) => q.track.id));
    const playedTrackIds = new Set(session.playedTracks || []);
    const newCandidates = candidates.filter(
      (t) => !existingTrackIds.has(t.id) && !playedTrackIds.has(t.id)
    );

    console.log(`Filtered out ${candidates.length - newCandidates.length} duplicate/played tracks`);

    // 3. Score and rank tracks
    const scored = scoreTracks(
      newCandidates,
      tasteProfiles,
      commonGenres,
      session.votes.like,
      session.queue.slice(-5).map((q) => q.track) // Last 5 tracks for diversity check
    );

    // 4. Sort by score and take top N
    const sorted = sortByScore(scored);
    const topTracks = sorted.slice(0, targetSize).map((s) => s.track);

    // 5. Convert to QueueItems
    const queueItems: QueueItem[] = topTracks.map((track, index) => ({
      track,
      position: session.queue.length + index,
      addedBy: "algorithm",
      addedAt: Date.now(),
      isStable: index < 3, // First 3 are stable
    }));

    return queueItems;
  }

  /**
   * Get candidate tracks from Spotify using recommendations endpoint
   * Strategy: Use Spotify's recommendation engine with seed artists and genres
   * This is much more efficient than fetching from each artist individually
   */
  private async getCandidateTracks(
    commonArtists: string[],
    commonGenres: string[],
    tasteProfiles: TasteProfile[],
    count: number
  ): Promise<Track[]> {
    const allTracks: Track[] = [];

    // Strategy 1: Use recommendations with seed artists and genres (most efficient)
    // Spotify allows up to 5 seeds total, so we'll make multiple calls if needed
    const selectedArtists = this.selectArtists(commonArtists, tasteProfiles);
    const selectedGenres = commonGenres.slice(0, 5);

    console.log(`Fetching recommendations using ${selectedArtists.length} artists and ${selectedGenres.length} genres`);

    // Make multiple recommendation calls to get enough variety
    // Each call can use up to 5 seeds
    const recommendationCalls = Math.ceil(count / 20); // Get 20 tracks per call
    const artistChunks = this.chunkArray(selectedArtists, 3); // Use 3 artists per call + 2 genres

    for (let i = 0; i < Math.min(recommendationCalls, artistChunks.length); i++) {
      try {
        const seedArtists = artistChunks[i];
        const seedGenres = selectedGenres.slice(0, 2); // Use 2 genres per call

        const recommendations = await this.spotifyService.getRecommendations({
          seedArtists,
          seedGenres: seedGenres.length > 0 ? seedGenres : undefined,
          limit: 20,
        });

        allTracks.push(...recommendations);
        console.log(`Got ${recommendations.length} recommendations from call ${i + 1}/${recommendationCalls}`);
      } catch (error) {
        console.error(`Failed to get recommendations for call ${i + 1}:`, error);
      }
    }

    // If we didn't get enough tracks, fall back to artist top tracks
    if (allTracks.length < count / 2) {
      console.log(`Not enough recommendations (${allTracks.length}), fetching top tracks from popular artists`);

      for (const artistId of selectedArtists.slice(0, 5)) {
        try {
          const tracks = await this.spotifyService.searchTracksByArtist(artistId, 10);
          allTracks.push(...tracks);
          console.log(`Got ${tracks.length} top tracks from artist ${artistId}`);
        } catch (error) {
          console.error(`Failed to get tracks for artist ${artistId}:`, error);
        }
      }
    }

    // Shuffle tracks to mix variety
    const shuffled = this.shuffleArray(allTracks);

    console.log(`Successfully collected ${shuffled.length} candidate tracks`);
    return shuffled.slice(0, count);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Select artists to fetch tracks from
   * Prioritizes common artists, then adds unique artists from each user
   */
  private selectArtists(
    commonArtists: string[],
    tasteProfiles: TasteProfile[]
  ): string[] {
    const artists: string[] = [];

    // Prioritize common artists (take up to 10 for single-user, scales down with more users)
    if (commonArtists.length > 0) {
      artists.push(...commonArtists.slice(0, 10));
    }

    // Add unique artists from each user
    if (artists.length < 15) {
      for (const profile of tasteProfiles) {
        const uniqueArtists = profile.topArtists
          .map((a) => a.id)
          .filter((id) => !artists.includes(id));

        // Add multiple unique artists per user
        const artistsToAdd = uniqueArtists.slice(0, 3);
        artists.push(...artistsToAdd);

        if (artists.length >= 15) break;
      }
    }

    return artists.slice(0, 15);
  }


  /**
   * Merge new queue with stable tracks from existing queue
   */
  mergeWithStableQueue(
    existingQueue: QueueItem[],
    newQueue: QueueItem[]
  ): QueueItem[] {
    // Keep next 3 tracks stable
    const stableTracks = existingQueue.slice(0, 3).map((item, index) => ({
      ...item,
      position: index,
      isStable: true,
    }));

    // Add new tracks after stable ones
    const newTracks = newQueue.map((item, index) => ({
      ...item,
      position: stableTracks.length + index,
      isStable: false,
    }));

    return [...stableTracks, ...newTracks];
  }
}
