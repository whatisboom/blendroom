import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TasteAnalysisService } from '@/lib/services/taste-analysis.service';
import { SpotifyService } from '@/lib/services/spotify.service';
import { createMockSpotifyTrack } from '../../factories/spotify.factory';
import type { SpotifyArtist, Participant, TasteProfile } from '@/types';

// Mock Spotify service
vi.mock('@/lib/services/spotify.service');

describe('TasteAnalysisService', () => {
  let service: TasteAnalysisService;
  let mockSpotifyService: SpotifyService;
  const TEST_ACCESS_TOKEN = 'test-token';

  const createMockArtist = (id: string, genres: string[] = []): SpotifyArtist => ({
    id,
    name: `Artist ${id}`,
    external_urls: { spotify: `https://spotify.com/artist/${id}` },
    genres,
  });

  const createMockParticipant = (userId: string): Participant => ({
    userId,
    name: `User ${userId}`,
    isHost: false,
    isDJ: false,
  });

  beforeEach(() => {
    service = new TasteAnalysisService(TEST_ACCESS_TOKEN);
    mockSpotifyService = new SpotifyService(TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
  });

  describe('analyzeUserTaste', () => {
    it('fetches and analyzes user taste profile', async () => {
      const mockTracks = [
        createMockSpotifyTrack({ id: 'track-1' }),
        createMockSpotifyTrack({ id: 'track-2' }),
      ];

      const mockArtists = [
        createMockArtist('artist-1', ['rock', 'indie']),
        createMockArtist('artist-2', ['rock', 'alternative']),
      ];

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const profile = await service.analyzeUserTaste('user-1');

      expect(profile.userId).toBe('user-1');
      expect(profile.topTracks).toEqual(['track-1', 'track-2']);
      expect(profile.topArtists).toHaveLength(2);
      expect(profile.topGenres).toContain('rock');
      expect(profile.lastUpdated).toBeDefined();
    });

    it('caches taste profiles', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];
      const mockArtists = [createMockArtist('artist-1', ['rock'])];

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      await service.analyzeUserTaste('user-1');
      await service.analyzeUserTaste('user-1');

      // Should only fetch once due to caching
      expect(mockSpotifyService.getUserTopTracks).toHaveBeenCalledTimes(1);
      expect(mockSpotifyService.getUserTopArtists).toHaveBeenCalledTimes(1);
    });

    it('extracts top genres from artists', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];
      const mockArtists = [
        createMockArtist('artist-1', ['rock', 'indie']),
        createMockArtist('artist-2', ['rock', 'alternative']),
        createMockArtist('artist-3', ['jazz']),
      ];

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const profile = await service.analyzeUserTaste('user-1');

      // rock appears twice, should be top genre
      expect(profile.topGenres[0]).toBe('rock');
    });

    it('handles artists without genres', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];
      const mockArtists = [createMockArtist('artist-1')]; // No genres

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const profile = await service.analyzeUserTaste('user-1');

      expect(profile.topGenres).toEqual([]);
    });
  });

  describe('findCommonArtists', () => {
    it('returns all artists for single profile', () => {
      const profile: TasteProfile = {
        userId: 'user-1',
        topTracks: [],
        topArtists: [createMockArtist('artist-1'), createMockArtist('artist-2')],
        topGenres: [],
      };

      const common = service.findCommonArtists([profile]);

      expect(common).toHaveLength(2);
    });

    it('finds artists common to all profiles', () => {
      const profiles: TasteProfile[] = [
        {
          userId: 'user-1',
          topTracks: [],
          topArtists: [createMockArtist('artist-1'), createMockArtist('artist-2')],
          topGenres: [],
        },
        {
          userId: 'user-2',
          topTracks: [],
          topArtists: [createMockArtist('artist-1'), createMockArtist('artist-3')],
          topGenres: [],
        },
      ];

      const common = service.findCommonArtists(profiles);

      expect(common).toHaveLength(1);
      expect(common[0].id).toBe('artist-1');
    });

    it('returns empty array when no common artists', () => {
      const profiles: TasteProfile[] = [
        {
          userId: 'user-1',
          topTracks: [],
          topArtists: [createMockArtist('artist-1')],
          topGenres: [],
        },
        {
          userId: 'user-2',
          topTracks: [],
          topArtists: [createMockArtist('artist-2')],
          topGenres: [],
        },
      ];

      const common = service.findCommonArtists(profiles);

      expect(common).toEqual([]);
    });

    it('returns empty array for empty profiles', () => {
      const common = service.findCommonArtists([]);
      expect(common).toEqual([]);
    });
  });

  describe('findCommonGenres', () => {
    it('returns all genres for single profile', () => {
      const profile: TasteProfile = {
        userId: 'user-1',
        topTracks: [],
        topArtists: [],
        topGenres: ['rock', 'indie'],
      };

      const common = service.findCommonGenres([profile]);

      expect(common).toEqual(['rock', 'indie']);
    });

    it('finds genres in at least 50% of profiles', () => {
      const profiles: TasteProfile[] = [
        {
          userId: 'user-1',
          topTracks: [],
          topArtists: [],
          topGenres: ['rock', 'indie'],
        },
        {
          userId: 'user-2',
          topTracks: [],
          topArtists: [],
          topGenres: ['rock', 'jazz'],
        },
      ];

      const common = service.findCommonGenres(profiles);

      // rock appears in both (100%), should be included
      expect(common).toContain('rock');
      // indie and jazz only appear in 1 of 2 (50%), should be included (threshold is ceil(2/2) = 1)
      expect(common.length).toBeGreaterThanOrEqual(1);
    });

    it('sorts genres by frequency', () => {
      const profiles: TasteProfile[] = [
        {
          userId: 'user-1',
          topTracks: [],
          topArtists: [],
          topGenres: ['rock', 'jazz'],
        },
        {
          userId: 'user-2',
          topTracks: [],
          topArtists: [],
          topGenres: ['rock', 'indie'],
        },
        {
          userId: 'user-3',
          topTracks: [],
          topArtists: [],
          topGenres: ['rock'],
        },
      ];

      const common = service.findCommonGenres(profiles);

      // rock appears in all 3 profiles, should be first
      expect(common[0]).toBe('rock');
    });

    it('returns empty array for empty profiles', () => {
      const common = service.findCommonGenres([]);
      expect(common).toEqual([]);
    });

    it('handles threshold correctly with 3 profiles', () => {
      const profiles: TasteProfile[] = [
        {
          userId: 'user-1',
          topTracks: [],
          topArtists: [],
          topGenres: ['rock'],
        },
        {
          userId: 'user-2',
          topTracks: [],
          topArtists: [],
          topGenres: ['jazz'],
        },
        {
          userId: 'user-3',
          topTracks: [],
          topArtists: [],
          topGenres: ['indie'],
        },
      ];

      const common = service.findCommonGenres(profiles);

      // threshold is ceil(3/2) = 2, no genre appears in 2+ profiles
      expect(common).toEqual([]);
    });
  });

  describe('generateSessionProfile', () => {
    it('aggregates participant profiles', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];
      const mockArtists = [createMockArtist('artist-1', ['rock'])];

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const participants = [
        createMockParticipant('user-1'),
        createMockParticipant('user-2'),
      ];

      const profile = await service.generateSessionProfile(participants);

      expect(profile.tasteProfiles).toHaveLength(2);
      expect(profile.commonArtists).toBeDefined();
      expect(profile.commonGenres).toBeDefined();
    });

    it('handles single participant', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];
      const mockArtists = [createMockArtist('artist-1', ['rock'])];

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const participants = [createMockParticipant('user-1')];

      const profile = await service.generateSessionProfile(participants);

      expect(profile.tasteProfiles).toHaveLength(1);
      expect(profile.commonArtists).toHaveLength(1);
      expect(profile.commonGenres).toContain('rock');
    });
  });

  describe('clearCache', () => {
    it('clears cache for specific user', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];
      const mockArtists = [createMockArtist('artist-1', ['rock'])];

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      await service.analyzeUserTaste('user-1');
      service.clearCache('user-1');
      await service.analyzeUserTaste('user-1');

      // Should fetch twice (once before clear, once after)
      expect(mockSpotifyService.getUserTopTracks).toHaveBeenCalledTimes(2);
    });

    it('clears all cache when no userId provided', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];
      const mockArtists = [createMockArtist('artist-1', ['rock'])];

      vi.spyOn(mockSpotifyService, 'getUserTopTracks').mockResolvedValue(mockTracks);
      vi.spyOn(mockSpotifyService, 'getUserTopArtists').mockResolvedValue(mockArtists);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      await service.analyzeUserTaste('user-1');
      await service.analyzeUserTaste('user-2');
      service.clearCache();
      await service.analyzeUserTaste('user-1');
      await service.analyzeUserTaste('user-2');

      // Should fetch 4 times total (2 before clear, 2 after)
      expect(mockSpotifyService.getUserTopTracks).toHaveBeenCalledTimes(4);
    });
  });
});
