import type { Track, AudioFeatures, TasteProfile, LikeVote } from "@/types";
import { calculateFeatureDistance } from "./audio-features";

interface ScoredTrack {
  track: Track;
  score: number;
  reasons: string[];
}

/**
 * Score tracks based on how well they match the session profile
 */
export function scoreTracks(
  candidates: Track[],
  sessionAvgFeatures: AudioFeatures,
  tasteProfiles: TasteProfile[],
  likedVotes: LikeVote[],
  recentTracks: Track[]
): ScoredTrack[] {
  // Calculate liked features if any
  const likedFeatures = likedVotes.length > 0
    ? calculateLikedProfile(likedVotes, candidates)
    : null;

  return candidates.map((track) => {
    let score = 0;
    const reasons: string[] = [];

    if (!track.audioFeatures) {
      return { track, score: -1, reasons: ["Missing audio features"] };
    }

    // 1. Base score: similarity to session average (40% weight)
    const featureDistance = calculateFeatureDistance(
      track.audioFeatures,
      sessionAvgFeatures
    );
    const featureScore = Math.max(0, 1 - featureDistance) * 0.4;
    score += featureScore;
    reasons.push(`Feature match: ${(featureScore * 100).toFixed(0)}%`);

    // 2. Liked tracks influence (30% weight if likes exist)
    if (likedFeatures) {
      const likeDistance = calculateFeatureDistance(
        track.audioFeatures,
        likedFeatures
      );
      const likeScore = Math.max(0, 1 - likeDistance) * 0.3 * 2; // Double weight
      score += likeScore;
      reasons.push(`Like similarity: ${(likeScore * 100).toFixed(0)}%`);
    }

    // 3. Participant match: how many users would like this (20% weight)
    const participantMatchScore = calculateParticipantMatch(
      track,
      tasteProfiles
    );
    score += participantMatchScore * 0.2;
    reasons.push(
      `User appeal: ${(participantMatchScore * 100).toFixed(0)}%`
    );

    // 4. Diversity penalty: avoid same artist back-to-back (10% weight)
    const diversityPenalty = calculateDiversityPenalty(track, recentTracks);
    score -= diversityPenalty;
    if (diversityPenalty > 0) {
      reasons.push(`Diversity penalty: -${(diversityPenalty * 100).toFixed(0)}%`);
    }

    return { track, score, reasons };
  });
}

/**
 * Calculate how many participants would likely enjoy this track
 */
function calculateParticipantMatch(
  track: Track,
  tasteProfiles: TasteProfile[]
): number {
  if (tasteProfiles.length === 0) return 0;

  let matches = 0;

  for (const profile of tasteProfiles) {
    // Check if artist is in user's top artists
    const artistMatch = track.artists.some((artist) =>
      profile.topArtists.some((topArtist) => topArtist.id === artist.id)
    );

    if (artistMatch) {
      matches++;
      continue;
    }

    // Check if track is in user's top tracks
    const trackMatch = profile.topTracks.includes(track.id);
    if (trackMatch) {
      matches++;
      continue;
    }

    // Check if audio features are similar to user's average
    if (track.audioFeatures) {
      const distance = calculateFeatureDistance(
        track.audioFeatures,
        profile.avgAudioFeatures
      );
      if (distance < 0.5) {
        // Within similarity threshold
        matches += 0.5; // Partial match
      }
    }
  }

  return matches / tasteProfiles.length;
}

/**
 * Penalize tracks from artists that were recently played
 */
function calculateDiversityPenalty(
  track: Track,
  recentTracks: Track[]
): number {
  if (recentTracks.length === 0) return 0;

  const trackArtistIds = new Set(track.artists.map((a) => a.id));

  // Check last 3 tracks
  const recentArtistIds = recentTracks
    .slice(-3)
    .flatMap((t) => t.artists.map((a) => a.id));

  // Count how many times any of this track's artists appear in recent tracks
  let matches = 0;
  for (const artistId of trackArtistIds) {
    if (recentArtistIds.includes(artistId)) {
      matches++;
    }
  }

  // Higher penalty for more recent matches
  if (matches > 0) {
    return 0.3 * matches; // 30% penalty per match
  }

  return 0;
}

/**
 * Calculate average features of liked tracks
 */
function calculateLikedProfile(
  likedVotes: LikeVote[],
  candidates: Track[]
): AudioFeatures | null {
  const likedTrackIds = new Set(likedVotes.map((v) => v.trackId));
  const likedTracks = candidates.filter((t) => likedTrackIds.has(t.id));

  if (likedTracks.length === 0) return null;

  const likedFeatures = likedTracks
    .map((t) => t.audioFeatures)
    .filter((f): f is AudioFeatures => f !== undefined);

  if (likedFeatures.length === 0) return null;

  // Calculate average
  const sum = likedFeatures.reduce(
    (acc, f) => ({
      id: "",
      danceability: acc.danceability + f.danceability,
      energy: acc.energy + f.energy,
      valence: acc.valence + f.valence,
      tempo: acc.tempo + f.tempo,
      acousticness: acc.acousticness + f.acousticness,
      instrumentalness: acc.instrumentalness + f.instrumentalness,
      speechiness: acc.speechiness + f.speechiness,
      loudness: acc.loudness + f.loudness,
      key: acc.key,
      mode: acc.mode,
      time_signature: acc.time_signature,
    }),
    {
      id: "liked",
      danceability: 0,
      energy: 0,
      valence: 0,
      tempo: 0,
      acousticness: 0,
      instrumentalness: 0,
      speechiness: 0,
      loudness: 0,
      key: 0,
      mode: 0,
      time_signature: 4,
    }
  );

  const count = likedFeatures.length;

  return {
    id: "liked",
    danceability: sum.danceability / count,
    energy: sum.energy / count,
    valence: sum.valence / count,
    tempo: sum.tempo / count,
    acousticness: sum.acousticness / count,
    instrumentalness: sum.instrumentalness / count,
    speechiness: sum.speechiness / count,
    loudness: sum.loudness / count,
    key: sum.key,
    mode: sum.mode,
    time_signature: sum.time_signature,
  };
}

/**
 * Sort scored tracks by score (descending)
 */
export function sortByScore(scoredTracks: ScoredTrack[]): ScoredTrack[] {
  return scoredTracks.sort((a, b) => b.score - a.score);
}
