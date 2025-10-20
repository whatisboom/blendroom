import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/queue/[sessionId]/add/route';
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
    getByCode: vi.fn(),
  })),
}));

vi.mock('@/lib/services/session.service');
vi.mock('@/lib/services/spotify.service');

vi.mock('@/lib/websocket/server', () => ({
  broadcastToSession: vi.fn(),
}));

describe('POST /api/queue/[sessionId]/add', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (sessionId: string, body: unknown) => {
    return new NextRequest(`http://localhost:3000/api/queue/${sessionId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when trackId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest(mockSessionId, {});
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when trackId is empty', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest(mockSessionId, { trackId: '' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
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

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 403 when user is not a DJ', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: ['other-user'],
      participants: [
        { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false },
      ],
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(false);

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only DJs can add tracks');
  });

  it('returns 404 when track not found on Spotify', async () => {
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
    vi.mocked(SpotifyService.prototype.searchTracks).mockResolvedValue([]);

    const request = createRequest(mockSessionId, { trackId: 'nonexistent' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Track not found');
  });

  it('adds track to queue successfully', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [],
    });

    const mockTrack = createMockSpotifyTrack({ id: 'track-123', name: 'Test Track' });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.searchTracks).mockResolvedValue([mockTrack]);

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.queue).toHaveLength(1);
    expect(data.added.track.id).toBe('track-123');
    expect(data.added.track.name).toBe('Test Track');
    expect(data.added.addedBy).toBe(mockUserId);
    expect(data.added.position).toBe(0);
    expect(data.added.isStable).toBe(false);
  });

  it('adds track to end of existing queue', async () => {
    const existingTrack = createMockSpotifyTrack({ id: 'existing-track' });
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [
        {
          track: existingTrack,
          position: 0,
          addedBy: 'other-user',
          addedAt: Date.now() - 1000,
          isStable: true,
        },
      ],
    });

    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.searchTracks).mockResolvedValue([mockTrack]);

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.queue).toHaveLength(2);
    expect(data.added.position).toBe(1);
  });

  it('includes all required track fields in queue item', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
      queue: [],
    });

    const mockTrack = createMockSpotifyTrack({
      id: 'track-123',
      name: 'Test Track',
      uri: 'spotify:track:123',
      duration_ms: 180000,
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.searchTracks).mockResolvedValue([mockTrack]);

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(data.added.track).toHaveProperty('id');
    expect(data.added.track).toHaveProperty('name');
    expect(data.added.track).toHaveProperty('uri');
    expect(data.added.track).toHaveProperty('duration_ms');
    expect(data.added.track).toHaveProperty('artists');
    expect(data.added.track).toHaveProperty('album');
    expect(data.added).toHaveProperty('addedBy');
    expect(data.added).toHaveProperty('addedAt');
    expect(data.added).toHaveProperty('position');
    expect(data.added).toHaveProperty('isStable');
  });

  it('searches Spotify with correct query format', async () => {
    const mockSession = createMockSession({
      id: mockSessionId,
      djs: [mockUserId],
    });

    const mockTrack = createMockSpotifyTrack({ id: 'track-123' });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.getSession).mockResolvedValue(mockSession);
    vi.mocked(SessionService.prototype.isDJ).mockReturnValue(true);
    vi.mocked(SpotifyService.prototype.searchTracks).mockResolvedValue([mockTrack]);

    const request = createRequest(mockSessionId, { trackId: 'abc123' });
    await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });

    expect(SpotifyService.prototype.searchTracks).toHaveBeenCalledWith('track:abc123', 1);
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
    vi.mocked(SpotifyService.prototype.searchTracks).mockRejectedValue(
      new Error('Spotify API error')
    );

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Spotify API error');
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
    vi.mocked(SpotifyService.prototype.searchTracks).mockRejectedValue('Unexpected error');

    const request = createRequest(mockSessionId, { trackId: 'track-123' });
    const response = await POST(request, { params: Promise.resolve({ sessionId: mockSessionId }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
