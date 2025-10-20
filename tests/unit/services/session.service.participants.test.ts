import { describe, it, expect } from 'vitest';
import { setupSessionServiceTest } from './session.service.setup';
import { createMockSession, createMockParticipant } from '../../factories/session.factory';

describe('SessionService - Participants', () => {
  const { getStore, getService } = setupSessionServiceTest();

  describe('joinSession', () => {
    it('adds a new participant to existing session', async () => {
      const service = getService();
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
      const service = getService();
      const store = getStore();
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
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      const result1 = await service.joinSession(session.code, 'user-456', 'User');
      expect(result1.participants).toHaveLength(2);

      const result2 = await service.joinSession(session.code, 'user-456', 'User');
      expect(result2.participants).toHaveLength(2);
    });

    it('throws error for invalid session code', async () => {
      const service = getService();
      await expect(
        service.joinSession('INVALID', 'user-123', 'User Name')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('leaveSession', () => {
    it('removes participant from session', async () => {
      const service = getService();
      const store = getStore();
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      await service.leaveSession(session.id, 'user-456');

      const updatedSession = await store.get(session.id);
      expect(updatedSession?.participants).toHaveLength(1);
      expect(updatedSession?.participants[0].userId).toBe('host-123');
    });

    it('removes participant votes when they leave', async () => {
      const service = getService();
      const store = getStore();
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
      const service = getService();
      const store = getStore();
      const session = await service.createSession('host-123', 'Host Name');

      await service.leaveSession(session.id, 'host-123');

      const deletedSession = await store.get(session.id);
      expect(deletedSession).toBeNull();
    });

    it('transfers host when host leaves', async () => {
      const service = getService();
      const store = getStore();
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
      const service = getService();
      const store = getStore();
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      // Make user a DJ
      await service.manageDJ(session.id, 'host-123', 'user-456', 'add');

      await service.leaveSession(session.id, 'user-456');

      const updatedSession = await store.get(session.id);
      expect(updatedSession?.djs).not.toContain('user-456');
    });

    it('updates skip threshold when participant leaves', async () => {
      const service = getService();
      const store = getStore();
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
      const service = getService();
      await expect(
        service.leaveSession('invalid-id', 'user-123')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('getSession', () => {
    it('returns session by ID', async () => {
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      const found = await service.getSession(session.id);

      expect(found).toEqual(session);
    });

    it('returns null for non-existent session', async () => {
      const service = getService();
      const found = await service.getSession('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('getSessionByCode', () => {
    it('returns session by code', async () => {
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      const found = await service.getSessionByCode(session.code);

      expect(found).toEqual(session);
    });

    it('returns null for non-existent code', async () => {
      const service = getService();
      const found = await service.getSessionByCode('INVALID');

      expect(found).toBeNull();
    });
  });

  describe('isParticipant', () => {
    it('returns true for participant', () => {
      const service = getService();
      const participant = createMockParticipant({ userId: 'user-123' });
      const session = createMockSession({ participants: [participant] });

      expect(service.isParticipant(session, 'user-123')).toBe(true);
    });

    it('returns false for non-participant', () => {
      const service = getService();
      const session = createMockSession();

      expect(service.isParticipant(session, 'non-existent')).toBe(false);
    });
  });
});
