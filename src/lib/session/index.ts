import { SessionStore } from "./store.interface";
import { InMemoryStore } from "./memory-store";
import { RedisStore } from "./redis-store";

/**
 * Get the session store based on environment configuration
 */
export function getSessionStore(): SessionStore {
  const storeType = process.env.SESSION_STORE || "memory";

  if (storeType === "redis") {
    console.log("Using Redis session store");
    return new RedisStore();
  }

  console.log("Using in-memory session store");
  return new InMemoryStore();
}

// Export a singleton instance
let storeInstance: SessionStore | null = null;

export function getStore(): SessionStore {
  if (!storeInstance) {
    storeInstance = getSessionStore();
  }
  return storeInstance;
}

// Export types and implementations
export type { SessionStore };
export { InMemoryStore, RedisStore };
