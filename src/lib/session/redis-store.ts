import { Session } from "@/types";
import { SessionStore } from "./store.interface";
import Redis from "ioredis";

/**
 * Type guard to validate Session data from Redis
 */
function isValidSession(data: unknown): data is Session {
  if (typeof data !== 'object' || data === null) return false;

  const session = data as Record<string, unknown>;

  return (
    typeof session.id === 'string' &&
    typeof session.code === 'string' &&
    typeof session.hostId === 'string' &&
    Array.isArray(session.participants) &&
    Array.isArray(session.queue) &&
    typeof session.createdAt === 'number'
  );
}

/**
 * Redis session store implementation
 * For production use with persistent, scalable storage
 */
export class RedisStore implements SessionStore {
  private redis: Redis;
  private readonly keyPrefix = "session:";
  private readonly codePrefix = "code:";
  private readonly userPrefix = "user:";
  private readonly sessionsSet = "sessions:active"; // Set to track all active sessions
  private readonly ttl = 60 * 60 * 24; // 24 hours

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error("Redis connection failed after 3 retries");
          return null;
        }
        return Math.min(times * 1000, 3000);
      },
    });

    this.redis.on("error", (err) => {
      console.error("Redis error:", err);
    });

    this.redis.on("connect", () => {
      console.log("Redis connected");
    });
  }

  async get(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(this.keyPrefix + sessionId);
    if (!data) return null;

    const parsed = JSON.parse(data);
    if (!isValidSession(parsed)) {
      console.error(`Invalid session data from Redis for session ${sessionId}`);
      return null;
    }

    return parsed;
  }

  async getByCode(code: string): Promise<Session | null> {
    const sessionId = await this.redis.get(this.codePrefix + code);
    if (!sessionId) return null;
    return this.get(sessionId);
  }

  async set(sessionId: string, session: Session): Promise<void> {
    const data = JSON.stringify(session);

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Store session data
    pipeline.set(this.keyPrefix + sessionId, data, "EX", this.ttl);

    // Map code to session ID
    pipeline.set(this.codePrefix + session.code, sessionId, "EX", this.ttl);

    // Add to active sessions set
    pipeline.sadd(this.sessionsSet, sessionId);
    pipeline.expire(this.sessionsSet, this.ttl);

    // Index sessions by user ID for each participant
    for (const participant of session.participants) {
      pipeline.sadd(this.userPrefix + participant.userId, sessionId);
      pipeline.expire(this.userPrefix + participant.userId, this.ttl);
    }

    await pipeline.exec();
  }

  async delete(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) return;

    const pipeline = this.redis.pipeline();

    // Delete session data
    pipeline.del(this.keyPrefix + sessionId);

    // Delete code mapping
    pipeline.del(this.codePrefix + session.code);

    // Remove from active sessions set
    pipeline.srem(this.sessionsSet, sessionId);

    // Remove from user indexes
    for (const participant of session.participants) {
      pipeline.srem(this.userPrefix + participant.userId, sessionId);
    }

    await pipeline.exec();
  }

  async list(): Promise<Session[]> {
    // Use SMEMBERS to get all session IDs from the active sessions set
    // This is O(N) but doesn't block like KEYS does
    const sessionIds = await this.redis.smembers(this.sessionsSet);
    if (sessionIds.length === 0) return [];

    // Fetch all sessions in parallel
    const sessions = await Promise.all(
      sessionIds.map(id => this.get(id))
    );

    // Filter out null sessions (expired or deleted)
    return sessions.filter((s): s is Session => s !== null);
  }

  async exists(sessionId: string): Promise<boolean> {
    const result = await this.redis.exists(this.keyPrefix + sessionId);
    return result === 1;
  }

  async getByUserId(userId: string): Promise<Session[]> {
    const sessionIds = await this.redis.smembers(this.userPrefix + userId);
    if (sessionIds.length === 0) return [];

    const sessions = await Promise.all(
      sessionIds.map((id) => this.get(id))
    );

    return sessions.filter((s): s is Session => s !== null);
  }

  /**
   * Close the Redis connection (useful for cleanup)
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
