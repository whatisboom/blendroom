import { Session } from "@/types";
import { SessionStore } from "./store.interface";

/**
 * In-memory session store implementation
 * Good for development and MVP with small user base
 * NOTE: Data is lost on server restart
 */
export class InMemoryStore implements SessionStore {
  private sessions: Map<string, Session> = new Map();
  private codeToId: Map<string, string> = new Map();

  async get(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getByCode(code: string): Promise<Session | null> {
    const sessionId = this.codeToId.get(code);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  async set(sessionId: string, session: Session): Promise<void> {
    this.sessions.set(sessionId, session);
    this.codeToId.set(session.code, sessionId);
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.codeToId.delete(session.code);
    }
    this.sessions.delete(sessionId);
  }

  async list(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async getByUserId(userId: string): Promise<Session[]> {
    const sessions = Array.from(this.sessions.values());
    return sessions.filter((session) =>
      session.participants.some((p) => p.userId === userId)
    );
  }
}
