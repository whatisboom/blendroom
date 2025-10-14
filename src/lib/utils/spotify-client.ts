import SpotifyWebApi from "spotify-web-api-node";

/**
 * Create an authenticated Spotify API client
 */
export function createSpotifyClient(accessToken: string): SpotifyWebApi {
  const client = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  client.setAccessToken(accessToken);

  return client;
}

/**
 * Rate limiter for Spotify API calls
 * Spotify rate limit: ~180 requests per minute
 */
export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private requestCount = 0;
  private resetTime = Date.now() + 60000; // Reset every minute
  private readonly maxRequests = 150; // Conservative limit

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Reset counter if minute has passed
      if (Date.now() > this.resetTime) {
        this.requestCount = 0;
        this.resetTime = Date.now() + 60000;
      }

      // Wait if we've hit the rate limit
      if (this.requestCount >= this.maxRequests) {
        const waitTime = this.resetTime - Date.now();
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        this.requestCount = 0;
        this.resetTime = Date.now() + 60000;
      }

      const task = this.queue.shift();
      if (task) {
        this.requestCount++;
        await task();
      }
    }

    this.processing = false;
  }
}

// Singleton rate limiter instance
export const spotifyRateLimiter = new RateLimiter();
