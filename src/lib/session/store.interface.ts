import { Session } from "@/types";

/**
 * Session store interface for managing session data
 * Implementations: InMemoryStore, RedisStore
 */
export interface SessionStore {
  /**
   * Get a session by ID
   */
  get(sessionId: string): Promise<Session | null>;

  /**
   * Get a session by join code
   */
  getByCode(code: string): Promise<Session | null>;

  /**
   * Set/update a session
   */
  set(sessionId: string, session: Session): Promise<void>;

  /**
   * Delete a session
   */
  delete(sessionId: string): Promise<void>;

  /**
   * List all active sessions (useful for admin/debugging)
   */
  list(): Promise<Session[]>;

  /**
   * Check if a session exists
   */
  exists(sessionId: string): Promise<boolean>;

  /**
   * Get sessions by user ID (find all sessions a user is in)
   */
  getByUserId(userId: string): Promise<Session[]>;
}
