import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as LikePOST } from '@/app/api/vote/like/route';
import { POST as SkipPOST } from '@/app/api/vote/skip/route';
import { getServerSession } from 'next-auth';
import { SessionService } from '@/lib/services/session.service';
import { SpotifyService } from '@/lib/services/spotify.service';
import { createMockSession } from '../../../factories/session.factory';
import { createMockSpotifyTrack } from '../../../factories/spotify.factory';
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

describe('POST /api/vote/like', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  const mockSessionId = 'session-123';
  const mockTrackId = 'track-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/vote/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no access token', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: undefined,
    } as never);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when sessionId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when trackId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when sessionId is empty string', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ sessionId: '', trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when trackId is empty string', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ sessionId: mockSessionId, trackId: '' });
    const response = await LikePOST(request);
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

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 403 when user is not a participant', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: 'other-user', name: 'Other User', isHost: true, isDJ: true, joinedAt: Date.now() },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(false);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not a participant of this session');
  });

  it('adds like vote successfully', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      votes: {
        like: [],
        skip: [],
      },
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
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.liked).toBe(true);
    expect(data.likeCount).toBe(1);
  });

  it('removes like vote when already liked (unlike)', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      votes: {
        like: [
          { userId: mockUserId, trackId: mockTrackId, timestamp: Date.now() },
        ],
        skip: [],
      },
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
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.liked).toBe(false);
    expect(data.likeCount).toBe(0);
  });

  it('counts likes correctly with multiple users', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
        { userId: 'user-2', name: 'User 2', isHost: false, isDJ: false, joinedAt: Date.now() },
        { userId: 'user-3', name: 'User 3', isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      votes: {
        like: [
          { userId: 'user-2', trackId: mockTrackId, timestamp: Date.now() },
          { userId: 'user-3', trackId: mockTrackId, timestamp: Date.now() },
        ],
        skip: [],
      },
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
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.liked).toBe(true);
    expect(data.likeCount).toBe(3);
  });

  it('only affects likes for the specific track', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      votes: {
        like: [
          { userId: mockUserId, trackId: 'different-track', timestamp: Date.now() },
          { userId: 'user-2', trackId: mockTrackId, timestamp: Date.now() },
        ],
        skip: [],
      },
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
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.liked).toBe(true);
    expect(data.likeCount).toBe(2);
  });

  it('handles unexpected errors', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockRejectedValue('Unexpected error');

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await LikePOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/vote/skip', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  const mockSessionId = 'session-123';
  const mockTrackId = 'track-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/vote/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no access token', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: undefined,
    } as never);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
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

    const request = createRequest({ trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when trackId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ sessionId: mockSessionId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when sessionId is empty string', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ sessionId: '', trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when trackId is empty string', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ sessionId: mockSessionId, trackId: '' });
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

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 403 when user is not a participant', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: 'other-user', name: 'Other User', isHost: true, isDJ: true, joinedAt: Date.now() },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(false);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not a participant of this session');
  });

  it('returns 400 when vote to skip is disabled', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      settings: {
        voteToSkip: false,
        skipThreshold: 2,
      },
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Vote to skip is disabled for this session');
  });

  it('returns 400 when user already voted to skip this track', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      settings: {
        voteToSkip: true,
        skipThreshold: 2,
      },
      votes: {
        skip: [
          { userId: mockUserId, trackId: mockTrackId, timestamp: Date.now() },
        ],
        like: [],
      },
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Already voted to skip this track');
  });

  it('adds skip vote successfully when threshold not reached', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      settings: {
        voteToSkip: true,
        skipThreshold: 3,
      },
      votes: {
        skip: [
          { userId: 'user-2', trackId: mockTrackId, timestamp: Date.now() },
        ],
        like: [],
      },
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
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.skipped).toBe(false);
    expect(data.voteCount).toBe(2);
    expect(data.threshold).toBe(3);
  });

  it('skips track when threshold is reached', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      settings: {
        voteToSkip: true,
        skipThreshold: 2,
      },
      votes: {
        skip: [
          { userId: 'user-2', trackId: mockTrackId, timestamp: Date.now() },
        ],
        like: [],
      },
      activeDeviceId: 'device-123',
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      set: vi.fn(),
      get: vi.fn().mockResolvedValue(mockSession),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockResolvedValue(undefined);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.skipped).toBe(true);
    expect(data.voteCount).toBe(2);
    expect(data.threshold).toBe(2);
    expect(SpotifyService.prototype.skipToNext).toHaveBeenCalledWith('device-123');
  });

  it('skips track immediately when threshold is 1', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      settings: {
        voteToSkip: true,
        skipThreshold: 1,
      },
      votes: {
        skip: [],
        like: [],
      },
      activeDeviceId: 'device-123',
    });

    const { getStore } = await import('@/lib/session');
    const mockStore = {
      set: vi.fn(),
      get: vi.fn().mockResolvedValue(mockSession),
    };
    vi.mocked(getStore).mockReturnValue(mockStore as never);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockResolvedValue(undefined);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.skipped).toBe(true);
    expect(data.voteCount).toBe(1);
    expect(data.threshold).toBe(1);
  });

  it('only counts votes for the specific track', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      settings: {
        voteToSkip: true,
        skipThreshold: 3,
      },
      votes: {
        skip: [
          { userId: 'user-2', trackId: 'different-track', timestamp: Date.now() },
          { userId: 'user-3', trackId: mockTrackId, timestamp: Date.now() },
        ],
        like: [],
      },
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
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.skipped).toBe(false);
    expect(data.voteCount).toBe(2);
    expect(data.threshold).toBe(3);
  });

  it('handles Spotify API errors when skipping', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false, joinedAt: Date.now() },
      ],
      settings: {
        voteToSkip: true,
        skipThreshold: 1,
      },
      votes: {
        skip: [],
        like: [],
      },
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
    vi.mocked(SessionService.prototype.isParticipant).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.skipToNext).mockRejectedValue(new Error('Spotify error'));

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Spotify error');
  });

  it('handles unexpected errors', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockRejectedValue('Unexpected error');

    const request = createRequest({ sessionId: mockSessionId, trackId: mockTrackId });
    const response = await SkipPOST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
