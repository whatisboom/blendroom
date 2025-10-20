import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueGenerationService } from '@/lib/services/queue-generation.service';
import { SpotifyService } from '@/lib/services/spotify.service';
import { createMockSession } from '../../factories/session.factory';
import { createMockSpotifyTrack } from '../../factories/spotify.factory';
import type { Track, TasteProfile, QueueItem } from '@/types';

// Mock dependencies
vi.mock('@/lib/services/spotify.service');
vi.mock('@/lib/algorithm/scoring', () => ({
  scoreTracks: vi.fn((tracks) =>
    tracks.map((track: Track, index: number) => ({
      track,
      score: 100 - index, // Descending scores for testing
    }))
  ),
  sortByScore: vi.fn((scored) => [...scored].sort((a, b) => b.score - a.score)),
}));

describe('QueueGenerationService', () => {
  let service: QueueGenerationService;
  let mockSpotifyService: SpotifyService;
  const TEST_ACCESS_TOKEN = 'test-token';

  beforeEach(() => {
    service = new QueueGenerationService(TEST_ACCESS_TOKEN);
    mockSpotifyService = new SpotifyService(TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
  });

  describe('generateQueue', () => {
    it('throws error when session has no profile', async () => {
      const session = createMockSession({ profile: undefined });

      await expect(service.generateQueue(session)).rejects.toThrow(
        'Session profile not generated'
      );
    });

    it('generates queue with default size of 10 tracks', async () => {
      const mockTracks = Array.from({ length: 20 }, (_, i) =>
        createMockSpotifyTrack({ id: `track-${i}` })
      );

      vi.spyOn(mockSpotifyService, 'getRecommendations').mockResolvedValue(mockTracks);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const session = createMockSession({
        profile: {
          commonArtists: ['artist-1', 'artist-2'],
          commonGenres: ['rock', 'pop'],
          tasteProfiles: [] as TasteProfile[],
        },
        queue: [],
        playedTracks: [],
      });

      const queue = await service.generateQueue(session);

      expect(queue).toHaveLength(10);
      expect(queue[0].addedBy).toBe('algorithm');
      expect(queue[0].position).toBe(0);
    });

    it('marks first 3 tracks as stable', async () => {
      const mockTracks = Array.from({ length: 20 }, (_, i) =>
        createMockSpotifyTrack({ id: `track-${i}` })
      );

      vi.spyOn(mockSpotifyService, 'getRecommendations').mockResolvedValue(mockTracks);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const session = createMockSession({
        profile: {
          commonArtists: ['artist-1'],
          commonGenres: ['rock'],
          tasteProfiles: [] as TasteProfile[],
        },
        queue: [],
        playedTracks: [],
      });

      const queue = await service.generateQueue(session);

      expect(queue[0].isStable).toBe(true);
      expect(queue[1].isStable).toBe(true);
      expect(queue[2].isStable).toBe(true);
      expect(queue[3].isStable).toBe(false);
    });

    it('filters out tracks already in queue', async () => {
      const existingTrack = createMockSpotifyTrack({ id: 'existing-1' });
      const mockTracks = [
        existingTrack, // This should be filtered out
        createMockSpotifyTrack({ id: 'new-1' }),
        createMockSpotifyTrack({ id: 'new-2' }),
      ];

      vi.spyOn(mockSpotifyService, 'getRecommendations').mockResolvedValue(mockTracks);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const session = createMockSession({
        profile: {
          commonArtists: ['artist-1'],
          commonGenres: ['rock'],
          tasteProfiles: [] as TasteProfile[],
        },
        queue: [{
          track: existingTrack,
          position: 0,
          addedBy: 'user-1',
          addedAt: Date.now(),
          isStable: false,
        }],
        playedTracks: [],
      });

      const queue = await service.generateQueue(session, 2);

      // Should only have the new tracks, not the existing one
      expect(queue.every((item) => item.track.id !== 'existing-1')).toBe(true);
    });

    it('filters out already played tracks', async () => {
      const mockTracks = [
        createMockSpotifyTrack({ id: 'played-1' }), // This should be filtered
        createMockSpotifyTrack({ id: 'new-1' }),
        createMockSpotifyTrack({ id: 'new-2' }),
      ];

      vi.spyOn(mockSpotifyService, 'getRecommendations').mockResolvedValue(mockTracks);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const session = createMockSession({
        profile: {
          commonArtists: ['artist-1'],
          commonGenres: ['rock'],
          tasteProfiles: [] as TasteProfile[],
        },
        queue: [],
        playedTracks: ['played-1'],
      });

      const queue = await service.generateQueue(session, 2);

      expect(queue.every((item) => item.track.id !== 'played-1')).toBe(true);
    });

    it('respects custom target size', async () => {
      const mockTracks = Array.from({ length: 20 }, (_, i) =>
        createMockSpotifyTrack({ id: `track-${i}` })
      );

      vi.spyOn(mockSpotifyService, 'getRecommendations').mockResolvedValue(mockTracks);
      vi.spyOn(service as never, 'spotifyService' as never, 'get').mockReturnValue(mockSpotifyService);

      const session = createMockSession({
        profile: {
          commonArtists: ['artist-1'],
          commonGenres: ['rock'],
          tasteProfiles: [] as TasteProfile[],
        },
        queue: [],
        playedTracks: [],
      });

      const queue = await service.generateQueue(session, 5);

      expect(queue).toHaveLength(5);
    });
  });

  describe('mergeWithStableQueue', () => {
    it('preserves first 3 tracks from existing queue', () => {
      const existingQueue: QueueItem[] = Array.from({ length: 5 }, (_, i) => ({
        track: createMockSpotifyTrack({ id: `existing-${i}` }),
        position: i,
        addedBy: 'algorithm',
        addedAt: Date.now(),
        isStable: i < 3,
      }));

      const newQueue: QueueItem[] = Array.from({ length: 7 }, (_, i) => ({
        track: createMockSpotifyTrack({ id: `new-${i}` }),
        position: i,
        addedBy: 'algorithm',
        addedAt: Date.now(),
        isStable: false,
      }));

      const merged = service.mergeWithStableQueue(existingQueue, newQueue);

      // First 3 should be from existing queue
      expect(merged[0].track.id).toBe('existing-0');
      expect(merged[1].track.id).toBe('existing-1');
      expect(merged[2].track.id).toBe('existing-2');

      // Rest should be from new queue
      expect(merged[3].track.id).toBe('new-0');
      expect(merged[4].track.id).toBe('new-1');
    });

    it('marks stable tracks correctly', () => {
      const existingQueue: QueueItem[] = [{
        track: createMockSpotifyTrack({ id: 'existing-1' }),
        position: 0,
        addedBy: 'algorithm',
        addedAt: Date.now(),
        isStable: false, // Was not stable before
      }];

      const newQueue: QueueItem[] = [{
        track: createMockSpotifyTrack({ id: 'new-1' }),
        position: 0,
        addedBy: 'algorithm',
        addedAt: Date.now(),
        isStable: true, // Should be overridden
      }];

      const merged = service.mergeWithStableQueue(existingQueue, newQueue);

      // Existing track should now be stable
      expect(merged[0].isStable).toBe(true);
      // New track should not be stable
      expect(merged[1].isStable).toBe(false);
    });

    it('updates positions correctly', () => {
      const existingQueue: QueueItem[] = Array.from({ length: 3 }, (_, i) => ({
        track: createMockSpotifyTrack({ id: `existing-${i}` }),
        position: i,
        addedBy: 'algorithm',
        addedAt: Date.now(),
        isStable: true,
      }));

      const newQueue: QueueItem[] = Array.from({ length: 2 }, (_, i) => ({
        track: createMockSpotifyTrack({ id: `new-${i}` }),
        position: i,
        addedBy: 'algorithm',
        addedAt: Date.now(),
        isStable: false,
      }));

      const merged = service.mergeWithStableQueue(existingQueue, newQueue);

      // Check all positions are sequential
      merged.forEach((item, index) => {
        expect(item.position).toBe(index);
      });
    });

    it('handles empty new queue', () => {
      const existingQueue: QueueItem[] = Array.from({ length: 3 }, (_, i) => ({
        track: createMockSpotifyTrack({ id: `existing-${i}` }),
        position: i,
        addedBy: 'algorithm',
        addedAt: Date.now(),
        isStable: true,
      }));

      const merged = service.mergeWithStableQueue(existingQueue, []);

      expect(merged).toHaveLength(3);
      expect(merged.every((item) => item.isStable)).toBe(true);
    });
  });
});
