import { SpotifyService } from "./spotify.service";
import { scoreTracks, sortByScore } from "../algorithm/scoring";
import type { Session, Track, QueueItem, TasteProfile } from "@/types";

/**
 * Service for generating music queues based on session taste profile
 * Uses seed-based recommendations (artists, tracks, genres) instead of audio features
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
      targetSize * 3 // Get 3x more candidates for better selection
    );

    // 2. Remove duplicates (already in queue or played recently)
    const existingTrackIds = new Set(session.queue.map((q) => q.track.id));
    const newCandidates = candidates.filter(
      (t) => !existingTrackIds.has(t.id)
    );

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
   * Get candidate tracks from Spotify using seed-based recommendations
   * Strategy: 2 genres + 2 artists + 1 track (max 5 seeds)
   */
  private async getCandidateTracks(
    commonArtists: string[],
    commonGenres: string[],
    tasteProfiles: TasteProfile[],
    count: number
  ): Promise<Track[]> {
    // Select seed genres (prioritize common genres)
    const seedGenres = commonGenres.slice(0, 2);

    // Select seed artists (mix of common and individual favorites)
    const seedArtists = this.selectSeedArtists(commonArtists, tasteProfiles);

    // Select seed tracks from taste profiles (for diversity)
    const seedTracks = this.selectSeedTracks(tasteProfiles);

    console.log(`Generating queue with seeds:`, {
      genres: seedGenres,
      artists: seedArtists.slice(0, 2),
      tracks: seedTracks.slice(0, 1),
    });

    // Get recommendations (2 genres + 2 artists + 1 track = 5 seeds max)
    const recommendations = await this.spotifyService.getRecommendations({
      seedGenres,
      seedArtists: seedArtists.slice(0, 2),
      seedTracks: seedTracks.slice(0, 1),
      limit: count,
    });

    return recommendations;
  }

  /**
   * Select seed artists for recommendations
   */
  private selectSeedArtists(
    commonArtists: string[],
    tasteProfiles: TasteProfile[]
  ): string[] {
    const seeds: string[] = [];

    // Prioritize common artists
    if (commonArtists.length > 0) {
      seeds.push(...commonArtists.slice(0, 3));
    }

    // Add unique artists from each user
    if (seeds.length < 5) {
      for (const profile of tasteProfiles) {
        const uniqueArtists = profile.topArtists
          .map((a) => a.id)
          .filter((id) => !seeds.includes(id));

        if (uniqueArtists.length > 0) {
          seeds.push(uniqueArtists[0]);
        }

        if (seeds.length >= 5) break;
      }
    }

    return seeds.slice(0, 5);
  }

  /**
   * Select seed tracks for recommendations
   */
  private selectSeedTracks(tasteProfiles: TasteProfile[]): string[] {
    const seeds: string[] = [];

    // Get one track from each user
    for (const profile of tasteProfiles) {
      if (profile.topTracks.length > 0) {
        // Pick a random track from top 10
        const randomIndex = Math.floor(Math.random() * Math.min(10, profile.topTracks.length));
        seeds.push(profile.topTracks[randomIndex]);
      }

      if (seeds.length >= 5) break;
    }

    return seeds;
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
