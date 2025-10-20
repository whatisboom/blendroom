import { describe, it, expect } from 'vitest';
import { setupSessionServiceTest } from './session.service.setup';
import { createMockSession } from '../../factories/session.factory';

describe('SessionService - Settings & Admin', () => {
  const { getStore, getService } = setupSessionServiceTest();

  describe('updateSettings', () => {
    it('allows host to update settings', async () => {
      const service = getService();
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
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.updateSettings(session.id, 'other-user', {
          voteToSkip: false,
        })
      ).rejects.toThrow('Only the host can update settings');
    });

    it('throws error for non-existent session', async () => {
      const service = getService();
      await expect(
        service.updateSettings('invalid-id', 'user-123', {})
      ).rejects.toThrow('Session not found');
    });

    it('merges partial settings', async () => {
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      const updated = await service.updateSettings(session.id, 'host-123', {
        voteToSkip: false,
      });

      expect(updated.settings.voteToSkip).toBe(false);
      expect(updated.settings.skipThreshold).toBe(1); // Original value preserved
    });
  });

  describe('deleteSession', () => {
    it('allows host to delete session', async () => {
      const service = getService();
      const store = getStore();
      const session = await service.createSession('host-123', 'Host Name');

      await service.deleteSession(session.id, 'host-123');

      const deleted = await store.get(session.id);
      expect(deleted).toBeNull();
    });

    it('throws error when non-host tries to delete', async () => {
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.deleteSession(session.id, 'other-user')
      ).rejects.toThrow('Only the host can delete the session');
    });

    it('throws error for non-existent session', async () => {
      const service = getService();
      await expect(
        service.deleteSession('invalid-id', 'user-123')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('isHost', () => {
    it('returns true for host', () => {
      const service = getService();
      const session = createMockSession({ hostId: 'host-123' });

      expect(service.isHost(session, 'host-123')).toBe(true);
    });

    it('returns false for non-host', () => {
      const service = getService();
      const session = createMockSession({ hostId: 'host-123' });

      expect(service.isHost(session, 'other-user')).toBe(false);
    });
  });
});
