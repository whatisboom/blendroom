import type { Session } from '@/types/session';
import type { SessionStore } from '@/lib/session/store.interface';

/**
 * In-memory session store for testing
 */
export class MockSessionStore implements SessionStore {
  private sessions: Map<string, Session> = new Map();

  async get(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async set(sessionId: string, session: Session): Promise<void> {
    this.sessions.set(sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getByCode(code: string): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (session.code === code) {
        return session;
      }
    }
    return null;
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async list(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async getByUserId(userId: string): Promise<Session[]> {
    const sessions: Session[] = [];
    for (const session of this.sessions.values()) {
      const isParticipant = session.participants.some((p) => p.userId === userId);
      if (isParticipant) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  // Test helpers
  clear(): void {
    this.sessions.clear();
  }

  size(): number {
    return this.sessions.size;
  }
}
