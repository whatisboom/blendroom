import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpotifyService } from '@/lib/services/spotify.service';
import { createSpotifyClient, spotifyRateLimiter } from '@/lib/utils/spotify-client';
import { createMockSpotifyTrack } from '../../factories/spotify.factory';
import type { SpotifyArtist, AudioFeatures, SpotifyDevice } from '@/types';

// Mock the spotify client
vi.mock('@/lib/utils/spotify-client', () => ({
  createSpotifyClient: vi.fn(),
  spotifyRateLimiter: {
    execute: vi.fn((fn) => fn()),
  },
}));

describe('SpotifyService', () => {
  let service: SpotifyService;
  let mockClient: Record<string, unknown>;
  const TEST_ACCESS_TOKEN = 'test-token';

  const createMockArtist = (id: string): SpotifyArtist => ({
    id,
    name: `Artist ${id}`,
    external_urls: { spotify: `https://spotify.com/artist/${id}` },
    genres: ['rock'],
  });

  const createMockAudioFeatures = (id: string): AudioFeatures => ({
    id,
    danceability: 0.5,
    energy: 0.6,
    valence: 0.7,
    tempo: 120,
    acousticness: 0.3,
    instrumentalness: 0.1,
    liveness: 0.2,
    loudness: -5,
    speechiness: 0.05,
    key: 0,
    mode: 1,
    time_signature: 4,
    duration_ms: 180000,
  });

  const createMockDevice = (id: string): SpotifyDevice => ({
    id,
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    name: `Device ${id}`,
    type: 'Computer',
    volume_percent: 50,
  });

  beforeEach(() => {
    service = new SpotifyService(TEST_ACCESS_TOKEN);
    mockClient = {
      getMyTopTracks: vi.fn(),
      getMyTopArtists: vi.fn(),
      getAudioFeaturesForTracks: vi.fn(),
      searchTracks: vi.fn(),
      getArtistTopTracks: vi.fn(),
      getMyDevices: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      skipToNext: vi.fn(),
      getMyCurrentPlaybackState: vi.fn(),
      transferMyPlayback: vi.fn(),
      addToQueue: vi.fn(),
    };
    vi.mocked(createSpotifyClient).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });

  describe('getUserTopTracks', () => {
    it('fetches user top tracks with default parameters', async () => {
      const mockTracks = [
        createMockSpotifyTrack({ id: 'track-1' }),
        createMockSpotifyTrack({ id: 'track-2' }),
      ];

      vi.mocked(mockClient.getMyTopTracks).mockResolvedValue({
        body: { items: mockTracks },
      });

      const tracks = await service.getUserTopTracks();

      expect(createSpotifyClient).toHaveBeenCalledWith(TEST_ACCESS_TOKEN);
      expect(mockClient.getMyTopTracks).toHaveBeenCalledWith({
        limit: 50,
        time_range: 'medium_term',
      });
      expect(tracks).toEqual(mockTracks);
    });

    it('accepts custom limit and time range', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];

      vi.mocked(mockClient.getMyTopTracks).mockResolvedValue({
        body: { items: mockTracks },
      });

      await service.getUserTopTracks(20, 'short_term');

      expect(mockClient.getMyTopTracks).toHaveBeenCalledWith({
        limit: 20,
        time_range: 'short_term',
      });
    });
  });

  describe('getUserTopArtists', () => {
    it('fetches user top artists with default parameters', async () => {
      const mockArtists = [
        createMockArtist('artist-1'),
        createMockArtist('artist-2'),
      ];

      vi.mocked(mockClient.getMyTopArtists).mockResolvedValue({
        body: { items: mockArtists },
      });

      const artists = await service.getUserTopArtists();

      expect(createSpotifyClient).toHaveBeenCalledWith(TEST_ACCESS_TOKEN);
      expect(mockClient.getMyTopArtists).toHaveBeenCalledWith({
        limit: 50,
        time_range: 'medium_term',
      });
      expect(artists).toEqual(mockArtists);
    });

    it('accepts custom limit and time range', async () => {
      const mockArtists = [createMockArtist('artist-1')];

      vi.mocked(mockClient.getMyTopArtists).mockResolvedValue({
        body: { items: mockArtists },
      });

      await service.getUserTopArtists(30, 'long_term');

      expect(mockClient.getMyTopArtists).toHaveBeenCalledWith({
        limit: 30,
        time_range: 'long_term',
      });
    });
  });

  describe('getAudioFeatures', () => {
    it('fetches audio features for tracks', async () => {
      const trackIds = ['track-1', 'track-2', 'track-3'];
      const mockFeatures = trackIds.map(createMockAudioFeatures);

      vi.mocked(mockClient.getAudioFeaturesForTracks).mockResolvedValue({
        body: { audio_features: mockFeatures },
      });

      const features = await service.getAudioFeatures(trackIds);

      expect(mockClient.getAudioFeaturesForTracks).toHaveBeenCalledWith(trackIds);
      expect(features).toEqual(mockFeatures);
    });

    it('chunks large requests into batches of 100', async () => {
      const trackIds = Array.from({ length: 250 }, (_, i) => `track-${i}`);
      const mockFeatures = trackIds.map(createMockAudioFeatures);

      // Mock each chunk call
      vi.mocked(mockClient.getAudioFeaturesForTracks)
        .mockResolvedValueOnce({
          body: { audio_features: mockFeatures.slice(0, 100) },
        })
        .mockResolvedValueOnce({
          body: { audio_features: mockFeatures.slice(100, 200) },
        })
        .mockResolvedValueOnce({
          body: { audio_features: mockFeatures.slice(200, 250) },
        });

      const features = await service.getAudioFeatures(trackIds);

      expect(mockClient.getAudioFeaturesForTracks).toHaveBeenCalledTimes(3);
      expect(features).toHaveLength(250);
    });

    it('filters out null audio features', async () => {
      const trackIds = ['track-1', 'track-2', 'track-3'];
      const mockFeatures = [
        createMockAudioFeatures('track-1'),
        null,
        createMockAudioFeatures('track-3'),
      ];

      vi.mocked(mockClient.getAudioFeaturesForTracks).mockResolvedValue({
        body: { audio_features: mockFeatures },
      });

      const features = await service.getAudioFeatures(trackIds);

      expect(features).toHaveLength(2);
      expect(features.every((f) => f !== null)).toBe(true);
    });

    it('throws error on failure and logs track IDs', async () => {
      const trackIds = ['track-1', 'track-2'];
      const error = new Error('API Error');

      vi.mocked(mockClient.getAudioFeaturesForTracks).mockRejectedValue(error);

      await expect(service.getAudioFeatures(trackIds)).rejects.toThrow('API Error');
    });
  });

  describe('searchTracks', () => {
    it('searches for tracks with default limit', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];

      vi.mocked(mockClient.searchTracks).mockResolvedValue({
        body: { tracks: { items: mockTracks } },
      });

      const tracks = await service.searchTracks('test query');

      expect(mockClient.searchTracks).toHaveBeenCalledWith('test query', { limit: 20 });
      expect(tracks).toEqual(mockTracks);
    });

    it('accepts custom limit', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];

      vi.mocked(mockClient.searchTracks).mockResolvedValue({
        body: { tracks: { items: mockTracks } },
      });

      await service.searchTracks('test query', 50);

      expect(mockClient.searchTracks).toHaveBeenCalledWith('test query', { limit: 50 });
    });

    it('returns empty array when no tracks found', async () => {
      vi.mocked(mockClient.searchTracks).mockResolvedValue({
        body: { tracks: undefined },
      });

      const tracks = await service.searchTracks('no results');

      expect(tracks).toEqual([]);
    });
  });

  describe('searchTracksByArtist', () => {
    it('fetches artist top tracks', async () => {
      const mockTracks = [
        createMockSpotifyTrack({ id: 'track-1' }),
        createMockSpotifyTrack({ id: 'track-2' }),
      ];

      vi.mocked(mockClient.getArtistTopTracks).mockResolvedValue({
        body: { tracks: mockTracks },
      });

      const tracks = await service.searchTracksByArtist('artist-1');

      expect(mockClient.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 'US');
      expect(tracks).toEqual(mockTracks);
    });

    it('respects limit parameter', async () => {
      const mockTracks = Array.from({ length: 10 }, (_, i) =>
        createMockSpotifyTrack({ id: `track-${i}` })
      );

      vi.mocked(mockClient.getArtistTopTracks).mockResolvedValue({
        body: { tracks: mockTracks },
      });

      const tracks = await service.searchTracksByArtist('artist-1', 5);

      expect(tracks).toHaveLength(5);
    });
  });

  describe('searchTracksByGenre', () => {
    it('searches tracks by genre', async () => {
      const mockTracks = [createMockSpotifyTrack({ id: 'track-1' })];

      vi.mocked(mockClient.searchTracks).mockResolvedValue({
        body: { tracks: { items: mockTracks } },
      });

      const tracks = await service.searchTracksByGenre('rock');

      expect(mockClient.searchTracks).toHaveBeenCalledWith('genre:"rock"', { limit: 20 });
      expect(tracks).toEqual(mockTracks);
    });

    it('returns empty array when no tracks found', async () => {
      vi.mocked(mockClient.searchTracks).mockResolvedValue({
        body: { tracks: undefined },
      });

      const tracks = await service.searchTracksByGenre('unknown-genre');

      expect(tracks).toEqual([]);
    });
  });

  describe('getDevices', () => {
    it('fetches available devices', async () => {
      const mockDevices = [
        createMockDevice('device-1'),
        createMockDevice('device-2'),
      ];

      vi.mocked(mockClient.getMyDevices).mockResolvedValue({
        body: { devices: mockDevices },
      });

      const devices = await service.getDevices();

      expect(mockClient.getMyDevices).toHaveBeenCalled();
      expect(devices).toEqual(mockDevices);
    });
  });

  describe('play', () => {
    it('starts playback with no parameters', async () => {
      vi.mocked(mockClient.play).mockResolvedValue(undefined);

      await service.play();

      expect(mockClient.play).toHaveBeenCalledWith({});
    });

    it('starts playback with device ID', async () => {
      vi.mocked(mockClient.play).mockResolvedValue(undefined);

      await service.play('device-1');

      expect(mockClient.play).toHaveBeenCalledWith({ device_id: 'device-1' });
    });

    it('starts playback with URIs and position', async () => {
      vi.mocked(mockClient.play).mockResolvedValue(undefined);

      await service.play('device-1', ['spotify:track:1'], 5000);

      expect(mockClient.play).toHaveBeenCalledWith({
        device_id: 'device-1',
        uris: ['spotify:track:1'],
        position_ms: 5000,
      });
    });
  });

  describe('pause', () => {
    it('pauses playback with no device', async () => {
      vi.mocked(mockClient.pause).mockResolvedValue(undefined);

      await service.pause();

      expect(mockClient.pause).toHaveBeenCalledWith({});
    });

    it('pauses playback on specific device', async () => {
      vi.mocked(mockClient.pause).mockResolvedValue(undefined);

      await service.pause('device-1');

      expect(mockClient.pause).toHaveBeenCalledWith({ device_id: 'device-1' });
    });
  });

  describe('skipToNext', () => {
    it('skips to next track', async () => {
      vi.mocked(mockClient.skipToNext).mockResolvedValue(undefined);

      await service.skipToNext();

      expect(mockClient.skipToNext).toHaveBeenCalledWith({});
    });

    it('skips to next track on specific device', async () => {
      vi.mocked(mockClient.skipToNext).mockResolvedValue(undefined);

      await service.skipToNext('device-1');

      expect(mockClient.skipToNext).toHaveBeenCalledWith({ device_id: 'device-1' });
    });
  });

  describe('getPlaybackState', () => {
    it('fetches current playback state', async () => {
      const mockState = {
        is_playing: true,
        item: { id: 'track-1' },
        progress_ms: 12345,
        device: {
          id: 'device-1',
          is_active: true,
          is_private_session: false,
          is_restricted: false,
          name: 'My Speaker',
          type: 'Speaker',
          volume_percent: 50
        },
        shuffle_state: false,
        repeat_state: 'off'
      };

      vi.mocked(mockClient.getMyCurrentPlaybackState).mockResolvedValue({
        body: mockState,
      });

      const state = await service.getPlaybackState();

      expect(mockClient.getMyCurrentPlaybackState).toHaveBeenCalled();
      expect(state).toEqual(mockState);
    });
  });

  describe('transferPlayback', () => {
    it('transfers playback to device', async () => {
      vi.mocked(mockClient.transferMyPlayback).mockResolvedValue(undefined);

      await service.transferPlayback('device-1');

      expect(mockClient.transferMyPlayback).toHaveBeenCalledWith(['device-1'], { play: true });
    });

    it('transfers playback without auto-play', async () => {
      vi.mocked(mockClient.transferMyPlayback).mockResolvedValue(undefined);

      await service.transferPlayback('device-1', false);

      expect(mockClient.transferMyPlayback).toHaveBeenCalledWith(['device-1'], { play: false });
    });
  });

  describe('addToQueue', () => {
    it('adds track to queue', async () => {
      vi.mocked(mockClient.addToQueue).mockResolvedValue(undefined);

      await service.addToQueue('spotify:track:1');

      expect(mockClient.addToQueue).toHaveBeenCalledWith('spotify:track:1', {
        uri: 'spotify:track:1',
      });
    });

    it('adds track to queue on specific device', async () => {
      vi.mocked(mockClient.addToQueue).mockResolvedValue(undefined);

      await service.addToQueue('spotify:track:1', 'device-1');

      expect(mockClient.addToQueue).toHaveBeenCalledWith('spotify:track:1', {
        uri: 'spotify:track:1',
        device_id: 'device-1',
      });
    });
  });
});
