import { describe, it, expect } from 'vitest';
import { setupSessionServiceTest } from './session.service.setup';
import { createMockSession } from '../../factories/session.factory';

describe('SessionService - DJ Management', () => {
  const { getStore, getService } = setupSessionServiceTest();

  describe('manageDJ', () => {
    it('allows host to add DJ privileges', async () => {
      const service = getService();
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
      const service = getService();
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
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.manageDJ(session.id, 'host-123', 'host-123', 'remove')
      ).rejects.toThrow('Cannot remove DJ privileges from host');
    });

    it('throws error when non-host tries to manage DJs', async () => {
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      await expect(
        service.manageDJ(session.id, 'user-456', 'user-456', 'add')
      ).rejects.toThrow('Only the host can manage DJ privileges');
    });

    it('throws error when target user not in session', async () => {
      const service = getService();
      const session = await service.createSession('host-123', 'Host Name');

      await expect(
        service.manageDJ(session.id, 'host-123', 'non-existent', 'add')
      ).rejects.toThrow('User not in session');
    });

    it('does not duplicate DJ when already a DJ', async () => {
      const service = getService();
      const store = getStore();
      const session = await service.createSession('host-123', 'Host Name');
      await service.joinSession(session.code, 'user-456', 'User Name');

      await service.manageDJ(session.id, 'host-123', 'user-456', 'add');
      await service.manageDJ(session.id, 'host-123', 'user-456', 'add');

      const updated = await store.get(session.id);
      const djCount = updated?.djs.filter((id) => id === 'user-456').length;
      expect(djCount).toBe(1);
    });
  });

  describe('isDJ', () => {
    it('returns true for DJ', () => {
      const service = getService();
      const session = createMockSession({ djs: ['user-123', 'user-456'] });

      expect(service.isDJ(session, 'user-123')).toBe(true);
    });

    it('returns false for non-DJ', () => {
      const service = getService();
      const session = createMockSession({ djs: ['user-123'] });

      expect(service.isDJ(session, 'other-user')).toBe(false);
    });
  });
});
