import { beforeEach, vi } from 'vitest';
import { SessionService } from '@/lib/services/session.service';
import { MockSessionStore } from '../../mocks/mock-store';

// Mock the dependencies
vi.mock('@/lib/services/taste-analysis.service');
vi.mock('@/lib/services/queue-generation.service');
vi.mock('nanoid', () => ({
  nanoid: () => 'test-session-id',
}));
vi.mock('@/lib/utils/session-code', () => ({
  generateSessionCode: () => 'ABC123',
}));

export const TEST_ACCESS_TOKEN = 'test-token';

export function setupSessionServiceTest() {
  let store: MockSessionStore;
  let service: SessionService;

  beforeEach(() => {
    store = new MockSessionStore();
    service = new SessionService(store, TEST_ACCESS_TOKEN);
    vi.clearAllMocks();
  });

  return {
    getStore: () => store,
    getService: () => service,
  };
}
