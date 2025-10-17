import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService } from '@/lib/services/session.service';
import { MockSessionStore } from '../../mocks/mock-store';
import { createMockSession, createMockParticipant } from '../../factories/session.factory';

// Mock the dependencies
vi.mock('@/lib/services/taste-analysis.service');
vi.mock('@/lib/services/queue-generation.service');
vi.mock('nanoid', () => ({
  nanoid: () => 'test-session-id',
}));
vi.mock('@/lib/utils/session-code', () => ({
  generateSessionCode: () => 'ABC123',
}));

describe('SessionService', () => {
  let store: MockSessionStore;
  let service: SessionService;
  const TEST_ACCESS_TOKEN = 'test-token';

  beforeEach(() => {
    store = new MockSessionStore();
    service = new SessionService(store, TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('creates a session with default settings', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      expect(session).toBeDefined();
      expect(session.id).toBe('test-session-id');
      expect(session.code).toBe('ABC123');
      expect(session.hostId).toBe('host-123');
      expect(session.participants).toHaveLength(1);
      expect(session.participants[0]).toMatchObject({
        userId: 'host-123',
        name: 'Host Name',
        isHost: true,
        isDJ: true,
      });
      expect(session.settings).toEqual({
        voteToSkip: true,
        skipThreshold: 1, // Math.ceil(1/2) = 1
      });
    });

    it('creates a session with custom settings', async () => {
      const customSettings = {
        voteToSkip: false,
        skipThreshold: 5,
      };

      const session = await service.createSession('host-123', 'Host Name', {
        settings: customSettings,
      });

      expect(session.settings).toEqual(customSettings);
    });

    it('creates a session with custom code', async () => {
      const session = await service.createSession('host-123', 'Host Name', {
        customCode: 'CUSTOM-CODE',
      });

      expect(session.code).toBe('CUSTOM-CODE');
    });

    it('normalizes custom code to uppercase', async () => {
      const session = await service.createSession('host-123', 'Host Name', {
        customCode: 'lowercase',
      });

      expect(session.code).toBe('LOWERCASE');
    });

    it('throws error for custom code that is too short', async () => {
      await expect(
        service.createSession('host-123', 'Host Name', {
          customCode: 'ABC',
        })
      ).rejects.toThrow('Code must be between 4 and 12 characters');
    });

    it('throws error for custom code that is too long', async () => {
      await expect(
        service.createSession('host-123', 'Host Name', {
          customCode: 'VERYLONGCODE123',
        })
      ).rejects.toThrow('Code must be between 4 and 12 characters');
    });

    it('throws error for custom code with invalid characters', async () => {
      await expect(
        service.createSession('host-123', 'Host Name', {
          customCode: 'CODE@123',
        })
      ).rejects.toThrow('Code can only contain letters, numbers, and hyphens');
    });

    it('throws error for duplicate custom code', async () => {
      // Create first session
      await service.createSession('host-1', 'Host 1', {
        customCode: 'MYCODE',
      });

      // Try to create second session with same code
      await expect(
        service.createSession('host-2', 'Host 2', {
          customCode: 'MYCODE',
        })
      ).rejects.toThrow('This code is already in use');
    });

    it('initializes session with empty queue and votes', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      expect(session.queue).toEqual([]);
      expect(session.playedTracks).toEqual([]);
      expect(session.votes).toEqual({
        skip: [],
        like: [],
      });
    });

    it('stores session in store', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      const storedSession = await store.get(session.id);
      expect(storedSession).toEqual(session);
    });
  });

  describe('joinSession', () => {
    it('adds a new participant to existing session', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      const updatedSession = await service.joinSession(
        session.code,
        'user-456',
        'Participant Name'
      );

      expect(updatedSession.participants).toHaveLength(2);
      expect(updatedSession.participants[1]).toMatchObject({
        userId: 'user-456',
        name: 'Participant Name',
        isHost: false,
        isDJ: false,
      });
    });

    it('updates skip threshold when participant joins', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      expect(session.settings.skipThreshold).toBe(1); // Math.ceil(1/2)

      await service.joinSession(session.code, 'user-2', 'User 2');
      const updated1 = await store.get(session.id);
      expect(updated1?.settings.skipThreshold).toBe(1); // Math.ceil(2/2)

      await service.joinSession(session.code, 'user-3', 'User 3');
      const updated2 = await store.get(session.id);
      expect(updated2?.settings.skipThreshold).toBe(2); // Math.ceil(3/2)
    });

    it('does not add duplicate participant', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      const result1 = await service.joinSession(session.code, 'user-456', 'User');
      expect(result1.participants).toHaveLength(2);

      const result2 = await service.joinSession(session.code, 'user-456', 'User');
      expect(result2.participants).toHaveLength(2);
    });

    it('throws error for invalid session code', async () => {
      await expect(
        service.joinSession('INVALID', 'user-123', 'User Name')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('leaveSession', () => {
    it('removes participant from session', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      await service.leaveSession(session.id, 'user-456');

      const updatedSession = await store.get(session.id);
      expect(updatedSession?.participants).toHaveLength(1);
      expect(updatedSession?.participants[0].userId).toBe('host-123');
    });

    it('removes participant votes when they leave', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      // Manually add votes to simulate voting
      const storedSession = await store.get(session.id);
      if (storedSession) {
        storedSession.votes.skip.push({
          userId: 'user-456',
          trackId: 'track-1',
          timestamp: Date.now(),
        });
        await store.set(session.id, storedSession);
      }

      await service.leaveSession(session.id, 'user-456');

      const updatedSession = await store.get(session.id);
      expect(updatedSession?.votes.skip).toHaveLength(0);
    });

    it('deletes session when last participant leaves', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      await service.leaveSession(session.id, 'host-123');

      const deletedSession = await store.get(session.id);
      expect(deletedSession).toBeNull();
    });

    it('transfers host when host leaves', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      await service.leaveSession(session.id, 'host-123');

      const updatedSession = await store.get(session.id);
      expect(updatedSession?.hostId).toBe('user-456');
      expect(updatedSession?.participants[0].isHost).toBe(true);
      expect(updatedSession?.participants[0].isDJ).toBe(true);
      expect(updatedSession?.djs).toContain('user-456');
    });

    it('removes from DJ list when DJ leaves', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      // Make user a DJ
      await service.manageDJ(session.id, 'host-123', 'user-456', 'add');

      await service.leaveSession(session.id, 'user-456');

      const updatedSession = await store.get(session.id);
      expect(updatedSession?.djs).not.toContain('user-456');
    });

    it('updates skip threshold when participant leaves', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-2', 'User 2');
      await service.joinSession(session.code, 'user-3', 'User 3');

      const before = await store.get(session.id);
      expect(before?.settings.skipThreshold).toBe(2); // Math.ceil(3/2)

      await service.leaveSession(session.id, 'user-3');

      const after = await store.get(session.id);
      expect(after?.settings.skipThreshold).toBe(1); // Math.ceil(2/2)
    });

    it('throws error for invalid session', async () => {
      await expect(
        service.leaveSession('invalid-id', 'user-123')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('getSession', () => {
    it('returns session by ID', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      const found = await service.getSession(session.id);

      expect(found).toEqual(session);
    });

    it('returns null for non-existent session', async () => {
      const found = await service.getSession('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('getSessionByCode', () => {
    it('returns session by code', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      const found = await service.getSessionByCode(session.code);

      expect(found).toEqual(session);
    });

    it('returns null for non-existent code', async () => {
      const found = await service.getSessionByCode('INVALID');

      expect(found).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('allows host to delete session', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      await service.deleteSession(session.id, 'host-123');

      const deleted = await store.get(session.id);
      expect(deleted).toBeNull();
    });

    it('throws error when non-host tries to delete', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.deleteSession(session.id, 'other-user')
      ).rejects.toThrow('Only the host can delete the session');
    });

    it('throws error for non-existent session', async () => {
      await expect(
        service.deleteSession('invalid-id', 'user-123')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('updateSettings', () => {
    it('allows host to update settings', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      const updated = await service.updateSettings(session.id, 'host-123', {
        voteToSkip: false,
        skipThreshold: 10,
      });

      expect(updated.settings).toEqual({
        voteToSkip: false,
        skipThreshold: 10,
      });
    });

    it('throws error when non-host tries to update settings', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.updateSettings(session.id, 'other-user', {
          voteToSkip: false,
        })
      ).rejects.toThrow('Only the host can update settings');
    });

    it('throws error for non-existent session', async () => {
      await expect(
        service.updateSettings('invalid-id', 'user-123', {})
      ).rejects.toThrow('Session not found');
    });

    it('merges partial settings', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      const updated = await service.updateSettings(session.id, 'host-123', {
        voteToSkip: false,
      });

      expect(updated.settings.voteToSkip).toBe(false);
      expect(updated.settings.skipThreshold).toBe(1); // Original value preserved
    });
  });

  describe('manageDJ', () => {
    it('allows host to add DJ privileges', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      const updated = await service.manageDJ(
        session.id,
        'host-123',
        'user-456',
        'add'
      );

      expect(updated.djs).toContain('user-456');
      const participant = updated.participants.find((p) => p.userId === 'user-456');
      expect(participant?.isDJ).toBe(true);
    });

    it('allows host to remove DJ privileges', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');
      await service.manageDJ(session.id, 'host-123', 'user-456', 'add');

      const updated = await service.manageDJ(
        session.id,
        'host-123',
        'user-456',
        'remove'
      );

      expect(updated.djs).not.toContain('user-456');
      const participant = updated.participants.find((p) => p.userId === 'user-456');
      expect(participant?.isDJ).toBe(false);
    });

    it('throws error when trying to remove host DJ privileges', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.manageDJ(session.id, 'host-123', 'host-123', 'remove')
      ).rejects.toThrow('Cannot remove DJ privileges from host');
    });

    it('throws error when non-host tries to manage DJs', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      await expect(
        service.manageDJ(session.id, 'user-456', 'user-456', 'add')
      ).rejects.toThrow('Only the host can manage DJ privileges');
    });

    it('throws error when target user not in session', async () => {
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.manageDJ(session.id, 'host-123', 'non-existent', 'add')
      ).rejects.toThrow('User not in session');
    });

    it('does not duplicate DJ when already a DJ', async () => {
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      await service.manageDJ(session.id, 'host-123', 'user-456', 'add');
      await service.manageDJ(session.id, 'host-123', 'user-456', 'add');

      const updated = await store.get(session.id);
      const djCount = updated?.djs.filter((id) => id === 'user-456').length;
      expect(djCount).toBe(1);
    });
  });

  describe('isHost', () => {
    it('returns true for host', () => {
      const session = createMockSession({ hostId: 'host-123' });

      expect(service.isHost(session, 'host-123')).toBe(true);
    });

    it('returns false for non-host', () => {
      const session = createMockSession({ hostId: 'host-123' });

      expect(service.isHost(session, 'other-user')).toBe(false);
    });
  });

  describe('isDJ', () => {
    it('returns true for DJ', () => {
      const session = createMockSession({ djs: ['user-123', 'user-456'] });

      expect(service.isDJ(session, 'user-123')).toBe(true);
    });

    it('returns false for non-DJ', () => {
      const session = createMockSession({ djs: ['user-123'] });

      expect(service.isDJ(session, 'other-user')).toBe(false);
    });
  });

  describe('isParticipant', () => {
    it('returns true for participant', () => {
      const participant = createMockParticipant({ userId: 'user-123' });
      const session = createMockSession({ participants: [participant] });

      expect(service.isParticipant(session, 'user-123')).toBe(true);
    });

    it('returns false for non-participant', () => {
      const session = createMockSession();

      expect(service.isParticipant(session, 'non-existent')).toBe(false);
    });
  });
});
