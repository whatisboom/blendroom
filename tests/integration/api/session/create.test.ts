import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/session/create/route';
import { getServerSession } from 'next-auth';
import { SessionService } from '@/lib/services/session.service';
import { createMockSession } from '../../../factories/session.factory';
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
    getByCode: vi.fn(),
  })),
}));

vi.mock('@/lib/services/session.service');

describe('POST /api/session/create', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no access token', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: undefined,
    } as never);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('creates session with default settings', async () => {
    const mockSession = createMockSession({
      id: 'new-session-id',
      code: 'ABC123',
      hostId: mockUserId,
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockResolvedValue(mockSession);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session).toMatchObject({
      id: mockSession.id,
      code: mockSession.code,
      hostId: mockSession.hostId,
    });
    expect(SessionService.prototype.createSession).toHaveBeenCalledWith(
      mockUserId,
      mockUserName,
      {}
    );
  });

  it('creates session with custom code', async () => {
    const mockSession = createMockSession({
      code: 'CUSTOM',
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockResolvedValue(mockSession);

    const request = createRequest({ customCode: 'CUSTOM' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.code).toBe('CUSTOM');
    expect(SessionService.prototype.createSession).toHaveBeenCalledWith(
      mockUserId,
      mockUserName,
      { customCode: 'CUSTOM' }
    );
  });

  it('creates session with custom settings', async () => {
    const mockSession = createMockSession({
      settings: {
        voteToSkip: false,
        skipThreshold: 5,
      },
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockResolvedValue(mockSession);

    const request = createRequest({
      settings: {
        voteToSkip: false,
        skipThreshold: 5,
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.settings).toEqual({
      voteToSkip: false,
      skipThreshold: 5,
    });
  });

  it('returns 400 for invalid custom code (too short)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ customCode: 'ABC' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
    expect(data.details).toBeDefined();
  });

  it('returns 400 for invalid custom code (too long)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({ customCode: 'TOOLONGCODE123' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 for invalid skip threshold (negative)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({
      settings: {
        skipThreshold: -1,
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 for invalid skip threshold (zero)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({
      settings: {
        skipThreshold: 0,
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 for invalid skip threshold (decimal)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({
      settings: {
        skipThreshold: 2.5,
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 for invalid voteToSkip type', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    const request = createRequest({
      settings: {
        voteToSkip: 'true',
      },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('handles service errors gracefully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database connection failed');
  });

  it('handles duplicate code error', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockRejectedValue(
      new Error('Session code already exists')
    );

    const request = createRequest({ customCode: 'EXISTS' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('already exists');
  });

  it('uses "Unknown" for missing user name', async () => {
    const mockSession = createMockSession();

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: null },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockResolvedValue(mockSession);

    const request = createRequest({});
    await POST(request);

    expect(SessionService.prototype.createSession).toHaveBeenCalledWith(
      mockUserId,
      'Unknown',
      {}
    );
  });

  it('includes all required session fields in response', async () => {
    const mockSession = createMockSession({
      id: 'session-123',
      code: 'ABC123',
      hostId: 'user-123',
      participants: [
        { userId: 'user-123', name: 'Test User', isHost: true, isDJ: true },
      ],
      djs: ['user-123'],
      settings: {
        voteToSkip: true,
        skipThreshold: 1,
      },
      createdAt: Date.now(),
    });

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockResolvedValue(mockSession);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(data.session).toHaveProperty('id');
    expect(data.session).toHaveProperty('code');
    expect(data.session).toHaveProperty('hostId');
    expect(data.session).toHaveProperty('participants');
    expect(data.session).toHaveProperty('djs');
    expect(data.session).toHaveProperty('settings');
    expect(data.session).toHaveProperty('createdAt');
  });

  it('does not include sensitive fields in response', async () => {
    const mockSession = createMockSession();

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId, name: mockUserName },
      accessToken: mockAccessToken,
    } as never);

    vi.mocked(SessionService.prototype.createSession).mockResolvedValue(mockSession);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    // Should not include internal fields
    expect(data.session).not.toHaveProperty('profile');
    expect(data.session).not.toHaveProperty('queue');
    expect(data.session).not.toHaveProperty('votes');
  });
});
