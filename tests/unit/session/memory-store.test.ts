import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '@/lib/session/memory-store';
import { createMockSession } from '../../factories/session.factory';

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  describe('get', () => {
    it('returns null for non-existent session', async () => {
      const result = await store.get('non-existent-id');
      expect(result).toBeNull();
    });

    it('returns session after setting', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);

      const result = await store.get('session-1');
      expect(result).toEqual(session);
    });

    it('returns correct session when multiple exist', async () => {
      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({ id: 'session-2', code: 'XYZ789' });

      await store.set('session-1', session1);
      await store.set('session-2', session2);

      const result = await store.get('session-2');
      expect(result).toEqual(session2);
    });
  });

  describe('getByCode', () => {
    it('returns null for non-existent code', async () => {
      const result = await store.getByCode('ABC123');
      expect(result).toBeNull();
    });

    it('returns session by code', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);

      const result = await store.getByCode('ABC123');
      expect(result).toEqual(session);
    });

    it('returns correct session when multiple exist', async () => {
      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({ id: 'session-2', code: 'XYZ789' });

      await store.set('session-1', session1);
      await store.set('session-2', session2);

      const result = await store.getByCode('XYZ789');
      expect(result).toEqual(session2);
    });

    it('returns null when code mapping exists but session was deleted', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);
      await store.delete('session-1');

      const result = await store.getByCode('ABC123');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('stores a session', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);

      const result = await store.get('session-1');
      expect(result).toEqual(session);
    });

    it('creates code-to-id mapping', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);

      const result = await store.getByCode('ABC123');
      expect(result).toEqual(session);
    });

    it('overwrites existing session', async () => {
      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({
        id: 'session-1',
        code: 'ABC123',
        hostId: 'different-host',
      });

      await store.set('session-1', session1);
      await store.set('session-1', session2);

      const result = await store.get('session-1');
      expect(result).toEqual(session2);
      expect(result?.hostId).toBe('different-host');
    });

    it('updates code mapping when session code changes', async () => {
      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({ id: 'session-1', code: 'XYZ789' });

      await store.set('session-1', session1);
      await store.set('session-1', session2);

      const resultOldCode = await store.getByCode('ABC123');
      const resultNewCode = await store.getByCode('XYZ789');

      // Note: Implementation keeps old code mapping - both codes work
      expect(resultOldCode).toEqual(session2); // Returns updated session
      expect(resultNewCode).toEqual(session2);
    });
  });

  describe('delete', () => {
    it('removes session by id', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);
      await store.delete('session-1');

      const result = await store.get('session-1');
      expect(result).toBeNull();
    });

    it('removes code mapping', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);
      await store.delete('session-1');

      const result = await store.getByCode('ABC123');
      expect(result).toBeNull();
    });

    it('handles deleting non-existent session gracefully', async () => {
      await expect(store.delete('non-existent')).resolves.not.toThrow();

      const result = await store.get('non-existent');
      expect(result).toBeNull();
    });

    it('only deletes specified session', async () => {
      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({ id: 'session-2', code: 'XYZ789' });

      await store.set('session-1', session1);
      await store.set('session-2', session2);
      await store.delete('session-1');

      const result1 = await store.get('session-1');
      const result2 = await store.get('session-2');

      expect(result1).toBeNull();
      expect(result2).toEqual(session2);
    });
  });

  describe('list', () => {
    it('returns empty array when no sessions', async () => {
      const result = await store.list();
      expect(result).toEqual([]);
    });

    it('returns all sessions', async () => {
      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({ id: 'session-2', code: 'XYZ789' });
      const session3 = createMockSession({ id: 'session-3', code: 'DEF456' });

      await store.set('session-1', session1);
      await store.set('session-2', session2);
      await store.set('session-3', session3);

      const result = await store.list();

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(session1);
      expect(result).toContainEqual(session2);
      expect(result).toContainEqual(session3);
    });

    it('returns updated list after deletion', async () => {
      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({ id: 'session-2', code: 'XYZ789' });

      await store.set('session-1', session1);
      await store.set('session-2', session2);
      await store.delete('session-1');

      const result = await store.list();

      expect(result).toHaveLength(1);
      expect(result).toContainEqual(session2);
      expect(result).not.toContainEqual(session1);
    });
  });

  describe('exists', () => {
    it('returns false for non-existent session', async () => {
      const result = await store.exists('non-existent');
      expect(result).toBe(false);
    });

    it('returns true for existing session', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);

      const result = await store.exists('session-1');
      expect(result).toBe(true);
    });

    it('returns false after deletion', async () => {
      const session = createMockSession({ id: 'session-1', code: 'ABC123' });
      await store.set('session-1', session);
      await store.delete('session-1');

      const result = await store.exists('session-1');
      expect(result).toBe(false);
    });
  });

  describe('getByUserId', () => {
    it('returns empty array when no sessions', async () => {
      const result = await store.getByUserId('user-1');
      expect(result).toEqual([]);
    });

    it('returns sessions where user is a participant', async () => {
      const session1 = createMockSession({
        id: 'session-1',
        code: 'ABC123',
        participants: [
          { userId: 'user-1', name: 'User 1', isHost: true, isDJ: true },
        ],
      });

      const session2 = createMockSession({
        id: 'session-2',
        code: 'XYZ789',
        participants: [
          { userId: 'user-2', name: 'User 2', isHost: true, isDJ: true },
        ],
      });

      await store.set('session-1', session1);
      await store.set('session-2', session2);

      const result = await store.getByUserId('user-1');

      expect(result).toHaveLength(1);
      expect(result).toContainEqual(session1);
    });

    it('returns multiple sessions for same user', async () => {
      const session1 = createMockSession({
        id: 'session-1',
        code: 'ABC123',
        participants: [
          { userId: 'user-1', name: 'User 1', isHost: true, isDJ: true },
        ],
      });

      const session2 = createMockSession({
        id: 'session-2',
        code: 'XYZ789',
        participants: [
          { userId: 'user-1', name: 'User 1', isHost: false, isDJ: false },
        ],
      });

      await store.set('session-1', session1);
      await store.set('session-2', session2);

      const result = await store.getByUserId('user-1');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(session1);
      expect(result).toContainEqual(session2);
    });

    it('returns empty array for user not in any session', async () => {
      const session = createMockSession({
        id: 'session-1',
        code: 'ABC123',
        participants: [
          { userId: 'user-1', name: 'User 1', isHost: true, isDJ: true },
        ],
      });

      await store.set('session-1', session);

      const result = await store.getByUserId('user-2');

      expect(result).toEqual([]);
    });

    it('finds user in multi-participant session', async () => {
      const session = createMockSession({
        id: 'session-1',
        code: 'ABC123',
        participants: [
          { userId: 'user-1', name: 'User 1', isHost: true, isDJ: true },
          { userId: 'user-2', name: 'User 2', isHost: false, isDJ: false },
          { userId: 'user-3', name: 'User 3', isHost: false, isDJ: true },
        ],
      });

      await store.set('session-1', session);

      const result = await store.getByUserId('user-2');

      expect(result).toHaveLength(1);
      expect(result).toContainEqual(session);
    });
  });

  describe('data isolation', () => {
    it('maintains independent data across multiple stores', async () => {
      const store1 = new InMemoryStore();
      const store2 = new InMemoryStore();

      const session1 = createMockSession({ id: 'session-1', code: 'ABC123' });
      const session2 = createMockSession({ id: 'session-2', code: 'XYZ789' });

      await store1.set('session-1', session1);
      await store2.set('session-2', session2);

      const result1 = await store1.get('session-2');
      const result2 = await store2.get('session-1');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});
