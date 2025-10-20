import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as JOIN_POST } from '@/app/api/session/join/route';
import { POST as LEAVE_POST } from '@/app/api/session/leave/route';
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

vi.mock('@/lib/websocket/server', () => ({
  broadcastToSession: vi.fn(),
}));

vi.mock('@/lib/queue-background-regen', () => ({
  triggerBackgroundRegeneration: vi.fn(),
  cancelPendingRegeneration: vi.fn(),
}));

describe('Session Join/Leave API Routes', () => {
  const mockAccessToken = 'mock-access-token';
  const mockUserId = 'user-123';
  const mockUserName = 'Test User';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/session/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  describe('POST /api/session/join', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = createRequest({ code: 'ABC123' });
      const response = await JOIN_POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when code is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      const request = createRequest({});
      const response = await JOIN_POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('returns 400 when code is empty string', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      const request = createRequest({ code: '' });
      const response = await JOIN_POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('joins session successfully', async () => {
      const mockSession = createMockSession({
        id: 'session-123',
        code: 'ABC123',
        participants: [
          { userId: 'host-id', name: 'Host', isHost: true, isDJ: true },
          { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false },
        ],
      });

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.joinSession).mockResolvedValue(mockSession);

      const request = createRequest({ code: 'abc123' });
      const response = await JOIN_POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session.id).toBe('session-123');
      expect(data.session.code).toBe('ABC123');
      expect(SessionService.prototype.joinSession).toHaveBeenCalledWith(
        'ABC123',
        mockUserId,
        mockUserName
      );
    });

    it('converts code to uppercase', async () => {
      const mockSession = createMockSession({ code: 'ABC123' });

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.joinSession).mockResolvedValue(mockSession);

      const request = createRequest({ code: 'abc123' });
      await JOIN_POST(request);

      expect(SessionService.prototype.joinSession).toHaveBeenCalledWith(
        'ABC123',
        mockUserId,
        mockUserName
      );
    });

    it('uses "Unknown" for missing user name', async () => {
      const mockSession = createMockSession();

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: null },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.joinSession).mockResolvedValue(mockSession);

      const request = createRequest({ code: 'ABC123' });
      await JOIN_POST(request);

      expect(SessionService.prototype.joinSession).toHaveBeenCalledWith(
        'ABC123',
        mockUserId,
        'Unknown'
      );
    });

    it('returns 400 when session not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.joinSession).mockRejectedValue(
        new Error('Session not found')
      );

      const request = createRequest({ code: 'NOTFOUND' });
      const response = await JOIN_POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session not found');
    });

    it('returns 400 when user already in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.joinSession).mockRejectedValue(
        new Error('User already in session')
      );

      const request = createRequest({ code: 'ABC123' });
      const response = await JOIN_POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User already in session');
    });

    it('includes required session fields in response', async () => {
      const mockSession = createMockSession({
        id: 'session-123',
        code: 'ABC123',
        hostId: 'host-id',
        participants: [
          { userId: mockUserId, name: mockUserName, isHost: false, isDJ: false },
        ],
        djs: ['host-id'],
        settings: {
          voteToSkip: true,
          skipThreshold: 1,
        },
      });

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.joinSession).mockResolvedValue(mockSession);

      const request = createRequest({ code: 'ABC123' });
      const response = await JOIN_POST(request);
      const data = await response.json();

      expect(data.session).toHaveProperty('id');
      expect(data.session).toHaveProperty('code');
      expect(data.session).toHaveProperty('hostId');
      expect(data.session).toHaveProperty('participants');
      expect(data.session).toHaveProperty('djs');
      expect(data.session).toHaveProperty('settings');
    });
  });

  describe('POST /api/session/leave', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = createRequest({ sessionId: 'session-123' });
      const response = await LEAVE_POST(request);
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
      const response = await LEAVE_POST(request);
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
      const response = await LEAVE_POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('leaves session successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.leaveSession).mockResolvedValue(undefined);

      const request = createRequest({ sessionId: 'session-123' });
      const response = await LEAVE_POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(SessionService.prototype.leaveSession).toHaveBeenCalledWith(
        'session-123',
        mockUserId
      );
    });

    it('returns 400 when user not in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.leaveSession).mockRejectedValue(
        new Error('User not in session')
      );

      const request = createRequest({ sessionId: 'session-123' });
      const response = await LEAVE_POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User not in session');
    });

    it('returns 400 when session not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.leaveSession).mockRejectedValue(
        new Error('Session not found')
      );

      const request = createRequest({ sessionId: 'nonexistent' });
      const response = await LEAVE_POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session not found');
    });

    it('handles unexpected errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: mockUserId, name: mockUserName },
        accessToken: mockAccessToken,
      } as never);

      vi.mocked(SessionService.prototype.leaveSession).mockRejectedValue(
        'Unexpected error'
      );

      const request = createRequest({ sessionId: 'session-123' });
      const response = await LEAVE_POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
