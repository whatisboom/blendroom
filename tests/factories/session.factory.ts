import { faker } from '@faker-js/faker';
import type { Session, Participant, SessionSettings } from '@/types/session';

export function createMockParticipant(overrides?: Partial<Participant>): Participant {
  return {
    userId: faker.string.uuid(),
    name: faker.person.fullName(),
    joinedAt: Date.now(),
    isHost: false,
    isDJ: false,
    ...overrides,
  };
}

export function createMockSessionSettings(overrides?: Partial<SessionSettings>): SessionSettings {
  return {
    voteToSkip: true,
    skipThreshold: 2,
    ...overrides,
  };
}

export function createMockSession(overrides?: Partial<Session>): Session {
  const hostId = faker.string.uuid();
  const host = createMockParticipant({
    userId: hostId,
    isHost: true,
    isDJ: true,
  });

  return {
    id: faker.string.nanoid(),
    code: faker.string.alphanumeric({ length: 6, casing: 'upper' }),
    hostId,
    participants: [host],
    djs: [hostId],
    settings: createMockSessionSettings(),
    queue: [],
    playedTracks: [],
    votes: {
      skip: [],
      like: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastParticipantChange: Date.now(),
    ...overrides,
  };
}
