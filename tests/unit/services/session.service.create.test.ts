import { describe, it, expect } from 'vitest';
import { setupSessionServiceTest } from './session.service.setup';

describe('SessionService - createSession', () => {
  const { getStore, getService } = setupSessionServiceTest();

  it('creates a session with default settings', async () => {
    const service = getService();
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
    const service = getService();
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
    const service = getService();
    const session = await service.createSession('host-123', 'Host Name', {
      customCode: 'CUSTOM-CODE',
    });

    expect(session.code).toBe('CUSTOM-CODE');
  });

  it('normalizes custom code to uppercase', async () => {
    const service = getService();
    const session = await service.createSession('host-123', 'Host Name', {
      customCode: 'lowercase',
    });

    expect(session.code).toBe('LOWERCASE');
  });

  it('throws error for custom code that is too short', async () => {
    const service = getService();
    await expect(
      service.createSession('host-123', 'Host Name', {
        customCode: 'ABC',
      })
    ).rejects.toThrow('Code must be between 4 and 12 characters');
  });

  it('throws error for custom code that is too long', async () => {
    const service = getService();
    await expect(
      service.createSession('host-123', 'Host Name', {
        customCode: 'VERYLONGCODE123',
      })
    ).rejects.toThrow('Code must be between 4 and 12 characters');
  });

  it('throws error for custom code with invalid characters', async () => {
    const service = getService();
    await expect(
      service.createSession('host-123', 'Host Name', {
        customCode: 'CODE@123',
      })
    ).rejects.toThrow('Code can only contain letters, numbers, and hyphens');
  });

  it('throws error for duplicate custom code', async () => {
    const service = getService();
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
    const service = getService();
    const session = await service.createSession('host-123', 'Host Name');

    expect(session.queue).toEqual([]);
    expect(session.playedTracks).toEqual([]);
    expect(session.votes).toEqual({
      skip: [],
      like: [],
    });
  });

  it('stores session in store', async () => {
    const service = getService();
    const store = getStore();
    const session = await service.createSession('host-123', 'Host Name');

    const storedSession = await store.get(session.id);
    expect(storedSession).toEqual(session);
  });
});
