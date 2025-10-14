import { SpotifyService } from "./spotify.service";
import { scoreTracks, sortByScore } from "../algorithm/scoring";
import type { Session, Track, QueueItem, AudioFeatures, TasteProfile } from "@/types";

/**
 * Service for generating music queues based on session taste profile
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

    const { avgAudioFeatures, commonArtists, tasteProfiles } = session.profile;

    // 1. Get candidate tracks from Spotify recommendations
    const candidates = await this.getCandidateTracks(
      avgAudioFeatures,
      commonArtists,
      tasteProfiles,
      targetSize * 5 // Get 5x more candidates for better selection
    );

    // 2. Fetch audio features for all candidates
    const tracksWithFeatures = await this.enrichWithAudioFeatures(candidates);

    // 3. Remove duplicates (already in queue or played recently)
    const existingTrackIds = new Set(session.queue.map((q) => q.track.id));
    const newCandidates = tracksWithFeatures.filter(
      (t) => !existingTrackIds.has(t.id)
    );

    // 4. Score and rank tracks
    const scored = scoreTracks(
      newCandidates,
      avgAudioFeatures,
      tasteProfiles,
      session.votes.like,
      session.queue.slice(-5).map((q) => q.track) // Last 5 tracks for diversity check
    );

    // 5. Sort by score and take top N
    const sorted = sortByScore(scored);
    const topTracks = sorted.slice(0, targetSize).map((s) => s.track);

    // 6. Convert to QueueItems
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
   * Get candidate tracks from Spotify
   */
  private async getCandidateTracks(
    targetFeatures: AudioFeatures,
    commonArtists: string[],
    tasteProfiles: TasteProfile[],
    count: number
  ): Promise<Track[]> {
    // Select seed artists (mix of common and individual favorites)
    const seedArtists = this.selectSeedArtists(commonArtists, tasteProfiles);

    // Select seed tracks from taste profiles
    const seedTracks = this.selectSeedTracks(tasteProfiles);

    // Get recommendations
    const recommendations = await this.spotifyService.getRecommendations({
      seedArtists: seedArtists.slice(0, 2),
      seedTracks: seedTracks.slice(0, 3),
      targetFeatures,
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
   * Enrich tracks with audio features
   */
  private async enrichWithAudioFeatures(tracks: Track[]): Promise<Track[]> {
    const trackIds = tracks.map((t) => t.id);
    const audioFeatures = await this.spotifyService.getAudioFeatures(trackIds);

    // Create a map for quick lookup
    const featuresMap = new Map(audioFeatures.map((f) => [f.id, f]));

    // Add audio features to tracks
    return tracks.map((track) => ({
      ...track,
      audioFeatures: featuresMap.get(track.id),
    }));
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
