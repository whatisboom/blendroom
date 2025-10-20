import Redis from "ioredis";

/**
 * Redis pub/sub for cross-context event broadcasting
 * Used to communicate between Next.js API routes and WebSocket server
 */

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

/**
 * Get or create Redis publisher client
 */
function getPublisher(): Redis {
  if (!publisher) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    publisher = new Redis(redisUrl);
    publisher.on("error", (err) => {
      console.error("[RedisEvents] Publisher error:", err);
    });
    console.log("[RedisEvents] Publisher initialized");
  }
  return publisher;
}

/**
 * Get or create Redis subscriber client
 */
function getSubscriber(): Redis {
  if (!subscriber) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    subscriber = new Redis(redisUrl);
    subscriber.on("error", (err) => {
      console.error("[RedisEvents] Subscriber error:", err);
    });
    console.log("[RedisEvents] Subscriber initialized");
  }
  return subscriber;
}

/**
 * Publish an event to Redis pub/sub
 */
export async function publishEvent(
  channel: string,
  data: unknown
): Promise<void> {
  try {
    const pub = getPublisher();
    const message = JSON.stringify(data);
    await pub.publish(channel, message);
    console.log(`[RedisEvents] Published to channel: ${channel}`);
  } catch (error) {
    console.error("[RedisEvents] Error publishing event:", error);
    throw error;
  }
}

/**
 * Subscribe to events on a pattern
 * @param pattern Redis channel pattern (e.g., "session:*")
 * @param callback Handler for received messages
 */
export function subscribeToPattern(
  pattern: string,
  callback: (channel: string, message: string) => void
): void {
  const sub = getSubscriber();

  sub.psubscribe(pattern, (err, count) => {
    if (err) {
      console.error("[RedisEvents] Error subscribing to pattern:", err);
      return;
    }
    console.log(`[RedisEvents] Subscribed to pattern: ${pattern} (${count} subscriptions)`);
  });

  sub.on("pmessage", (pattern, channel, message) => {
    console.log(`[RedisEvents] Received message on channel: ${channel}`);
    callback(channel, message);
  });
}

/**
 * Close Redis connections
 */
export async function closeConnections(): Promise<void> {
  const closePromises: Promise<string>[] = [];

  if (publisher) {
    closePromises.push(publisher.quit());
    publisher = null;
  }

  if (subscriber) {
    closePromises.push(subscriber.quit());
    subscriber = null;
  }

  await Promise.all(closePromises);
  console.log("[RedisEvents] Connections closed");
}
