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
   * Get candidate tracks from Spotify by fetching top tracks from common artists
   * Strategy: Fetch top tracks from selected artists and shuffle for variety
   */
  private async getCandidateTracks(
    commonArtists: string[],
    commonGenres: string[],
    tasteProfiles: TasteProfile[],
    count: number
  ): Promise<Track[]> {
    const allTracks: Track[] = [];

    // Select artists based on common artists and user profiles
    const selectedArtists = this.selectArtists(commonArtists, tasteProfiles);

    console.log(`Fetching top tracks from ${selectedArtists.length} artists`);

    // Fetch top tracks from each selected artist
    // We'll fetch from enough artists to get the desired count
    const artistsToFetch = Math.min(selectedArtists.length, Math.ceil(count / 8)); // ~8 tracks per artist

    for (let i = 0; i < artistsToFetch; i++) {
      const artistId = selectedArtists[i];
      try {
        const tracks = await this.spotifyService.searchTracksByArtist(artistId, 10);
        allTracks.push(...tracks);
        console.log(`Got ${tracks.length} top tracks from artist ${artistId} (${i + 1}/${artistsToFetch})`);
      } catch (error) {
        console.error(`Failed to get tracks for artist ${artistId}:`, error);
      }
    }

    // Shuffle tracks to mix variety from different artists
    const shuffled = this.shuffleArray(allTracks);

    console.log(`Successfully collected ${shuffled.length} candidate tracks from ${artistsToFetch} artists`);
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
   * Always ensures first 3 tracks are marked as stable
   */
  mergeWithStableQueue(
    existingQueue: QueueItem[],
    newQueue: QueueItem[]
  ): QueueItem[] {
    // Take up to first 3 tracks from existing queue
    const stableTracks = existingQueue.slice(0, 3);

    // Calculate how many new tracks we need to fill the stable window
    const neededForStable = Math.max(0, 3 - stableTracks.length);

    // Split new queue into stable fill and remaining
    const stableFill = newQueue.slice(0, neededForStable);
    const remainingNew = newQueue.slice(neededForStable);

    // Mark first 3 tracks (from existing + new) as stable
    const merged = [
      ...stableTracks.map((item, index) => ({
        ...item,
        position: index,
        isStable: true,
      })),
      ...stableFill.map((item, index) => ({
        ...item,
        position: stableTracks.length + index,
        isStable: true,
      })),
      ...remainingNew.map((item, index) => ({
        ...item,
        position: stableTracks.length + stableFill.length + index,
        isStable: false,
      })),
    ];

    return merged;
  }
}
