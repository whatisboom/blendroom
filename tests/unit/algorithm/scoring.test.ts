import { describe, it, expect } from 'vitest';
import { scoreTracks, sortByScore } from '@/lib/algorithm/scoring';
import { createMockSpotifyTrack } from '../../factories/spotify.factory';
import type { Track, TasteProfile, LikeVote } from '@/types';

describe('Scoring Algorithm', () => {
  const createMockTasteProfile = (overrides?: Partial<TasteProfile>): TasteProfile => ({
    userId: 'user-1',
    topTracks: [],
    topArtists: [],
    topGenres: [],
    ...overrides,
  });

  describe('scoreTracks', () => {
    it('scores tracks based on participant match', () => {
      const track = createMockSpotifyTrack({
        id: 'track-1',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const profiles: TasteProfile[] = [
        createMockTasteProfile({
          topArtists: [
            { id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' }, genres: ['rock'] },
          ],
        }),
      ];

      const scored = scoreTracks([track], profiles, [], [], []);

      expect(scored).toHaveLength(1);
      expect(scored[0].track).toEqual(track);
      expect(scored[0].score).toBeGreaterThan(0);
      expect(scored[0].reasons).toContain('User appeal: 100%');
    });

    it('applies genre match scoring', () => {
      const track = createMockSpotifyTrack({
        id: 'track-1',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const profiles: TasteProfile[] = [
        createMockTasteProfile({
          topArtists: [
            { id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' }, genres: ['rock'] },
          ],
          topGenres: ['rock'],
        }),
      ];

      const scored = scoreTracks([track], profiles, ['rock'], [], []);

      expect(scored[0].score).toBeGreaterThan(0);
      expect(scored[0].reasons.some((r) => r.includes('Genre match'))).toBe(true);
    });

    it('boosts tracks from liked artists', () => {
      const likedTrack = createMockSpotifyTrack({
        id: 'liked-track',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const candidateTrack = createMockSpotifyTrack({
        id: 'candidate-track',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const likedVotes: LikeVote[] = [
        { userId: 'user-1', trackId: 'liked-track', timestamp: Date.now() },
      ];

      const profiles: TasteProfile[] = [createMockTasteProfile()];

      const scored = scoreTracks([likedTrack, candidateTrack], profiles, [], likedVotes, []);

      const candidateScore = scored.find((s) => s.track.id === 'candidate-track');
      expect(candidateScore?.reasons.some((r) => r.includes('Liked artist'))).toBe(true);
    });

    it('applies diversity penalty for recent artists', () => {
      const track = createMockSpotifyTrack({
        id: 'track-1',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const recentTrack = createMockSpotifyTrack({
        id: 'recent-track',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const profiles: TasteProfile[] = [createMockTasteProfile()];

      const scored = scoreTracks([track], profiles, [], [], [recentTrack]);

      expect(scored[0].reasons.some((r) => r.includes('Diversity penalty'))).toBe(true);
    });

    it('handles empty taste profiles', () => {
      const track = createMockSpotifyTrack({ id: 'track-1' });

      const scored = scoreTracks([track], [], [], [], []);

      expect(scored).toHaveLength(1);
      expect(scored[0].score).toBe(0);
    });

    it('handles multiple candidates', () => {
      const tracks = Array.from({ length: 5 }, (_, i) =>
        createMockSpotifyTrack({ id: `track-${i}` })
      );

      const profiles: TasteProfile[] = [createMockTasteProfile()];

      const scored = scoreTracks(tracks, profiles, [], [], []);

      expect(scored).toHaveLength(5);
      scored.forEach((s) => {
        expect(s).toHaveProperty('track');
        expect(s).toHaveProperty('score');
        expect(s).toHaveProperty('reasons');
      });
    });

    it('gives full participant match for artist match', () => {
      const track = createMockSpotifyTrack({
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const profiles: TasteProfile[] = [
        createMockTasteProfile({
          topArtists: [
            { id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } },
          ],
        }),
      ];

      const scored = scoreTracks([track], profiles, [], [], []);

      // Full match = 1.0, weighted at 50% = 0.5
      expect(scored[0].score).toBeGreaterThanOrEqual(0.5);
    });

    it('gives full participant match for track match', () => {
      const track = createMockSpotifyTrack({ id: 'track-1' });

      const profiles: TasteProfile[] = [
        createMockTasteProfile({
          topTracks: ['track-1'],
        }),
      ];

      const scored = scoreTracks([track], profiles, [], [], []);

      // Full match = 1.0, weighted at 50% = 0.5
      expect(scored[0].score).toBeGreaterThanOrEqual(0.5);
    });

    it('gives partial match for genre overlap', () => {
      const track = createMockSpotifyTrack({
        id: 'track-1',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const profiles: TasteProfile[] = [
        createMockTasteProfile({
          topArtists: [
            { id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' }, genres: ['rock'] },
          ],
          topGenres: ['rock'],
        }),
      ];

      const scored = scoreTracks([track], profiles, [], [], []);

      // Genre overlap gives partial match (0.3 * 0.5 = 0.15)
      expect(scored[0].score).toBeGreaterThan(0);
    });

    it('averages participant matches across multiple profiles', () => {
      const track = createMockSpotifyTrack({
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const profiles: TasteProfile[] = [
        createMockTasteProfile({
          userId: 'user-1',
          topArtists: [
            { id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } },
          ],
        }),
        createMockTasteProfile({
          userId: 'user-2',
          topArtists: [], // No match for this user
        }),
      ];

      const scored = scoreTracks([track], profiles, [], [], []);

      // 1 match out of 2 users = 0.5, weighted at 50% = 0.25
      expect(scored[0].score).toBe(0.25);
    });

    it('applies increasing diversity penalty for multiple recent matches', () => {
      const track = createMockSpotifyTrack({
        id: 'track-1',
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const recentTracks = [
        createMockSpotifyTrack({
          id: 'recent-1',
          artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
        }),
        createMockSpotifyTrack({
          id: 'recent-2',
          artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
        }),
      ];

      const profiles: TasteProfile[] = [createMockTasteProfile()];

      const scored = scoreTracks([track], profiles, [], [], recentTracks);

      // Should have penalty applied
      expect(scored[0].score).toBeLessThan(0);
    });

    it('only checks last 3 tracks for diversity penalty', () => {
      const track = createMockSpotifyTrack({
        artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
      });

      const recentTracks = [
        createMockSpotifyTrack({
          id: 'old-1',
          artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
        }),
        createMockSpotifyTrack({
          id: 'old-2',
          artists: [{ id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } }],
        }),
        createMockSpotifyTrack({
          id: 'recent-1',
          artists: [{ id: 'artist-2', name: 'Artist 2', external_urls: { spotify: '' } }],
        }),
        createMockSpotifyTrack({
          id: 'recent-2',
          artists: [{ id: 'artist-2', name: 'Artist 2', external_urls: { spotify: '' } }],
        }),
        createMockSpotifyTrack({
          id: 'recent-3',
          artists: [{ id: 'artist-2', name: 'Artist 2', external_urls: { spotify: '' } }],
        }),
      ];

      const profiles: TasteProfile[] = [createMockTasteProfile()];

      const scored = scoreTracks([track], profiles, [], [], recentTracks);

      // artist-1 only appears in old tracks (not in last 3), so no penalty
      expect(scored[0].reasons.every((r) => !r.includes('Diversity penalty'))).toBe(true);
    });

    it('handles tracks with multiple artists', () => {
      const track = createMockSpotifyTrack({
        artists: [
          { id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } },
          { id: 'artist-2', name: 'Artist 2', external_urls: { spotify: '' } },
        ],
      });

      const profiles: TasteProfile[] = [
        createMockTasteProfile({
          topArtists: [
            { id: 'artist-1', name: 'Artist 1', external_urls: { spotify: '' } },
          ],
        }),
      ];

      const scored = scoreTracks([track], profiles, [], [], []);

      // Should match based on first artist
      expect(scored[0].score).toBeGreaterThan(0);
    });
  });

  describe('sortByScore', () => {
    it('sorts tracks in descending order by score', () => {
      const tracks: Array<{ track: Track; score: number; reasons: string[] }> = [
        { track: createMockSpotifyTrack({ id: 'track-1' }), score: 0.5, reasons: [] },
        { track: createMockSpotifyTrack({ id: 'track-2' }), score: 0.9, reasons: [] },
        { track: createMockSpotifyTrack({ id: 'track-3' }), score: 0.2, reasons: [] },
      ];

      const sorted = sortByScore(tracks);

      expect(sorted[0].score).toBe(0.9);
      expect(sorted[1].score).toBe(0.5);
      expect(sorted[2].score).toBe(0.2);
    });

    it('maintains track references after sorting', () => {
      const track1 = createMockSpotifyTrack({ id: 'track-1' });
      const track2 = createMockSpotifyTrack({ id: 'track-2' });

      const tracks = [
        { track: track1, score: 0.3, reasons: [] },
        { track: track2, score: 0.7, reasons: [] },
      ];

      const sorted = sortByScore(tracks);

      expect(sorted[0].track).toBe(track2);
      expect(sorted[1].track).toBe(track1);
    });

    it('handles empty array', () => {
      const sorted = sortByScore([]);
      expect(sorted).toEqual([]);
    });

    it('handles single element', () => {
      const track = createMockSpotifyTrack({ id: 'track-1' });
      const tracks = [{ track, score: 0.5, reasons: [] }];

      const sorted = sortByScore(tracks);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].track).toBe(track);
    });

    it('handles equal scores', () => {
      const tracks = [
        { track: createMockSpotifyTrack({ id: 'track-1' }), score: 0.5, reasons: [] },
        { track: createMockSpotifyTrack({ id: 'track-2' }), score: 0.5, reasons: [] },
      ];

      const sorted = sortByScore(tracks);

      expect(sorted).toHaveLength(2);
      expect(sorted[0].score).toBe(0.5);
      expect(sorted[1].score).toBe(0.5);
    });
  });
});
