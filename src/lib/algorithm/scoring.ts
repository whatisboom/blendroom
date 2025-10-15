import type { Track, TasteProfile, LikeVote } from "@/types";

interface ScoredTrack {
  track: Track;
  score: number;
  reasons: string[];
}

/**
 * Score tracks based on how well they match the session profile
 * Uses artist/track/genre matching instead of audio features
 */
export function scoreTracks(
  candidates: Track[],
  tasteProfiles: TasteProfile[],
  commonGenres: string[],
  likedVotes: LikeVote[],
  recentTracks: Track[]
): ScoredTrack[] {
  // Calculate liked artists if any
  const likedArtists = likedVotes.length > 0
    ? extractLikedArtists(likedVotes, candidates)
    : new Set<string>();

  return candidates.map((track) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Participant match: how many users would like this (50% weight)
    const participantMatchScore = calculateParticipantMatch(
      track,
      tasteProfiles
    );
    score += participantMatchScore * 0.5;
    reasons.push(
      `User appeal: ${(participantMatchScore * 100).toFixed(0)}%`
    );

    // 2. Genre match with session (30% weight)
    const genreScore = calculateGenreMatch(track, tasteProfiles, commonGenres);
    score += genreScore * 0.3;
    reasons.push(`Genre match: ${(genreScore * 100).toFixed(0)}%`);

    // 3. Liked tracks influence (20% weight if likes exist)
    if (likedArtists.size > 0) {
      const artistMatch = track.artists.some((artist) =>
        likedArtists.has(artist.id)
      );
      if (artistMatch) {
        score += 0.2;
        reasons.push(`Liked artist: +20%`);
      }
    }

    // 4. Diversity penalty: avoid same artist back-to-back
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
 * Based on artist and track matches
 */
function calculateParticipantMatch(
  track: Track,
  tasteProfiles: TasteProfile[]
): number {
  if (tasteProfiles.length === 0) return 0;

  let matches = 0;

  for (const profile of tasteProfiles) {
    // Check if artist is in user's top artists (full match)
    const artistMatch = track.artists.some((artist) =>
      profile.topArtists.some((topArtist) => topArtist.id === artist.id)
    );

    if (artistMatch) {
      matches++;
      continue;
    }

    // Check if track is in user's top tracks (full match)
    const trackMatch = profile.topTracks.includes(track.id);
    if (trackMatch) {
      matches++;
      continue;
    }

    // Check if genres overlap (partial match)
    const trackGenres = extractTrackGenres(track, profile);
    const genreOverlap = trackGenres.some((genre) =>
      profile.topGenres.includes(genre)
    );
    if (genreOverlap) {
      matches += 0.3; // Partial match for genre similarity
    }
  }

  return matches / tasteProfiles.length;
}

/**
 * Extract genres for a track from artist data in profiles
 */
function extractTrackGenres(track: Track, profile: TasteProfile): string[] {
  const genres = new Set<string>();

  for (const artist of track.artists) {
    const profileArtist = profile.topArtists.find((a) => a.id === artist.id);
    if (profileArtist?.genres) {
      profileArtist.genres.forEach((g) => genres.add(g));
    }
  }

  return Array.from(genres);
}

/**
 * Calculate genre match score for a track
 */
function calculateGenreMatch(
  track: Track,
  tasteProfiles: TasteProfile[],
  commonGenres: string[]
): number {
  if (tasteProfiles.length === 0) return 0;

  // Extract all genres from track's artists across all profiles
  const trackGenres = new Set<string>();
  for (const profile of tasteProfiles) {
    const genres = extractTrackGenres(track, profile);
    genres.forEach((g) => trackGenres.add(g));
  }

  if (trackGenres.size === 0) return 0;

  // Count how many of the track's genres match common genres
  let matches = 0;
  for (const genre of trackGenres) {
    if (commonGenres.includes(genre)) {
      matches++;
    }
  }

  // Score is the ratio of matching genres to total genres
  return Math.min(1, matches / Math.max(1, commonGenres.length));
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
 * Extract artist IDs from liked tracks
 */
function extractLikedArtists(
  likedVotes: LikeVote[],
  candidates: Track[]
): Set<string> {
  const likedTrackIds = new Set(likedVotes.map((v) => v.trackId));
  const likedTracks = candidates.filter((t) => likedTrackIds.has(t.id));

  const artists = new Set<string>();
  for (const track of likedTracks) {
    track.artists.forEach((artist) => artists.add(artist.id));
  }

  return artists;
}

/**
 * Sort scored tracks by score (descending)
 */
export function sortByScore(scoredTracks: ScoredTrack[]): ScoredTrack[] {
  return scoredTracks.sort((a, b) => b.score - a.score);
}
