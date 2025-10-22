import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as PlayPOST } from '@/app/api/playback/play/route';
import { POST as PausePOST } from '@/app/api/playback/pause/route';
import { POST as SkipPOST } from '@/app/api/playback/skip/route';
import { POST as InitPOST } from '@/app/api/playback/init/route';
import { getServerSession } from 'next-auth';
import { SessionService } from '@/lib/services/session.service';
import { SpotifyService } from '@/lib/services/spotify.service';
import { createMockSession } from '../../../factories/session.factory';
import { createMockSpotifyTrack, createMockSpotifyDevice, createMockSpotifyDevices } from '../../../factories/spotify.factory';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  getStore: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/services/session.service');
vi.mock('@/lib/services/spotify.service');

vi.mock('@/lib/websocket/server', () => ({
  broadcastToSession: vi.fn(),
}));

vi.mock('@/lib/queue-auto-repopulate', () => ({
  checkAndRepopulateQueue: vi.fn(),
}));

describe('POST /api/playback/play', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/playback/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no access token', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: undefined,
    } as never);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when sessionId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({});
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when sessionId is empty string', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ sessionId: '' });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 403 when user is not a DJ', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: ['other-user'],
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(false);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only DJs can control playback');
  });

  it('returns 400 when queue is empty', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Queue is empty');
  });

  it('starts playback successfully with default device', async () => {
    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      activeDeviceId: 'device-123',
      queue: [
        {
          track: mockTrack,
          position: 0,
          addedBy: mockUserId,
          addedAt: Date.now(),
          isStable: true,
        },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.play).mockResolvedValue(undefined);
    vi.mocked(SpotifyService.prototype.getPlaybackState).mockResolvedValue({
      is_playing: true,
      item: mockTrack,
    } as never);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(SpotifyService.prototype.play).toHaveBeenCalledWith(
      'device-123',
      [`spotify:track:${mockTrack.id}`],
      0
    );
  });

  it('starts playback with custom device', async () => {
    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      activeDeviceId: 'device-123',
      queue: [
        {
          track: mockTrack,
          position: 0,
          addedBy: mockUserId,
          addedAt: Date.now(),
          isStable: true,
        },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.play).mockResolvedValue(undefined);
    vi.mocked(SpotifyService.prototype.getPlaybackState).mockResolvedValue({
      is_playing: true,
      item: mockTrack,
    } as never);

    const request = createRequest({ sessionId: mockSessionId, deviceId: 'custom-device' });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(SpotifyService.prototype.play).toHaveBeenCalledWith(
      'custom-device',
      [`spotify:track:${mockTrack.id}`],
      0
    );
  });

  it('returns 404 when no active device found', async () => {
    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [
        {
          track: mockTrack,
          position: 0,
          addedBy: mockUserId,
          addedAt: Date.now(),
          isStable: true,
        },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.play).mockRejectedValue({ statusCode: 404 });

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('No active Spotify device found');
  });

  it('handles Spotify API errors', async () => {
    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [
        {
          track: mockTrack,
          position: 0,
          addedBy: mockUserId,
          addedAt: Date.now(),
          isStable: true,
        },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.play).mockRejectedValue({
      statusCode: 403,
      body: { error: { message: 'Playback not available' } },
    });

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Playback not available');
  });

  it('handles unexpected errors', async () => {
    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [
        {
          track: mockTrack,
          position: 0,
          addedBy: mockUserId,
          addedAt: Date.now(),
          isStable: true,
        },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.play).mockRejectedValue('Unexpected error');

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PlayPOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/playback/pause', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/playback/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when sessionId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({});
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 403 when user is not a DJ', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: ['other-user'],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(false);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only DJs can control playback');
  });

  it('pauses playback successfully with default device', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      activeDeviceId: 'device-123',
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.pause).mockResolvedValue(undefined);
    vi.mocked(SpotifyService.prototype.getPlaybackState).mockResolvedValue({
      is_playing: false,
    } as never);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(SpotifyService.prototype.pause).toHaveBeenCalledWith('device-123');
  });

  it('pauses playback with custom device', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.pause).mockResolvedValue(undefined);
    vi.mocked(SpotifyService.prototype.getPlaybackState).mockResolvedValue({
      is_playing: false,
    } as never);

    const request = createRequest({ sessionId: mockSessionId, deviceId: 'custom-device' });
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(SpotifyService.prototype.pause).toHaveBeenCalledWith('custom-device');
  });

  it('handles Spotify API errors', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.pause).mockRejectedValue(new Error('Spotify error'));

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Spotify error');
  });

  it('handles unexpected errors', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.pause).mockRejectedValue('Unexpected error');

    const request = createRequest({ sessionId: mockSessionId });
    const response = await PausePOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/playback/skip', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/playback/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when sessionId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({});
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 403 when user is not a DJ', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: ['other-user'],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(false);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only DJs can skip tracks');
  });

  it('skips track successfully and clears skip votes', async () => {
    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      activeDeviceId: 'device-123',
      queue: [
        {
          track: mockTrack,
          position: 0,
          addedBy: mockUserId,
          addedAt: Date.now(),
          isStable: true,
        },
      ],
      votes: {
        skip: [
          { userId: 'user-1', trackId: 'track-123', timestamp: Date.now() },
          { userId: 'user-2', trackId: 'track-123', timestamp: Date.now() },
        ],
        like: [],
      },
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      get: vi.fn().mockResolvedValue(mockSession),
      set: vi.fn(),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockResolvedValue(undefined);
    vi.mocked(SpotifyService.prototype.getPlaybackState).mockResolvedValue({
      is_playing: true,
    } as never);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(SpotifyService.prototype.skipToNext).toHaveBeenCalledWith('device-123');
  });

  it('skips track with custom device', async () => {
    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [
        {
          track: mockTrack,
          position: 0,
          addedBy: mockUserId,
          addedAt: Date.now(),
          isStable: true,
        },
      ],
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      get: vi.fn().mockResolvedValue(mockSession),
      set: vi.fn(),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockResolvedValue(undefined);
    vi.mocked(SpotifyService.prototype.getPlaybackState).mockResolvedValue({
      is_playing: true,
    } as never);

    const request = createRequest({ sessionId: mockSessionId, deviceId: 'custom-device' });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(SpotifyService.prototype.skipToNext).toHaveBeenCalledWith('custom-device');
  });

  it('handles empty queue gracefully', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [],
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      get: vi.fn().mockResolvedValue(mockSession),
      set: vi.fn(),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockResolvedValue(undefined);
    vi.mocked(SpotifyService.prototype.getPlaybackState).mockResolvedValue({
      is_playing: true,
    } as never);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('handles Spotify API errors', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      get: vi.fn().mockResolvedValue(mockSession),
      set: vi.fn(),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockRejectedValue(new Error('Spotify error'));

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Spotify error');
  });

  it('handles unexpected errors', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      get: vi.fn().mockResolvedValue(mockSession),
      set: vi.fn(),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockRejectedValue('Unexpected error');

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/playback/init', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/playback/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when sessionId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({});
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 403 when user is not a DJ', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: ['other-user'],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(false);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only DJs can initialize playback');
  });

  it('returns 400 when no devices available', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.getDevices).mockResolvedValue([]);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No active Spotify devices found');
  });

  it('returns available devices when deviceId not provided', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    const mockDevices = createMockSpotifyDevices(3);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.getDevices).mockResolvedValue(mockDevices);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availableDevices).toHaveLength(3);
    expect(data.availableDevices[0]).toHaveProperty('id');
    expect(data.availableDevices[0]).toHaveProperty('name');
    expect(data.availableDevices[0]).toHaveProperty('type');
    expect(data.availableDevices[0]).toHaveProperty('is_active');
  });

  it('sets active device when deviceId provided', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    const mockDevice = createMockSpotifyDevice({
      id: 'device-123',
      name: 'Test Device',
      type: 'Computer',
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      set: vi.fn(),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.getDevices).mockResolvedValue([mockDevice]);

    const request = createRequest({ sessionId: mockSessionId, deviceId: 'device-123' });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.device).toEqual({
      id: 'device-123',
      name: 'Test Device',
      type: 'Computer',
    });
  });

  it('returns 404 when selected device not found', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    const mockDevices = createMockSpotifyDevices(2);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.getDevices).mockResolvedValue(mockDevices);

    const request = createRequest({ sessionId: mockSessionId, deviceId: 'nonexistent-device' });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Selected device not found');
  });

  it('handles Spotify API errors', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.getDevices).mockRejectedValue(new Error('Spotify error'));

    const request = createRequest({ sessionId: mockSessionId });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Spotify error');
  });

  it('handles unexpected errors', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.getDevices).mockRejectedValue('Unexpected error');

    const request = createRequest({ sessionId: mockSessionId });
    const response = await InitPOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
