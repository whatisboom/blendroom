import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSpotifyClient, RateLimiter } from '@/lib/utils/spotify-client';

// Mock the spotify-web-api-node module
vi.mock('spotify-web-api-node', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      setAccessToken: vi.fn(),
    })),
  };
});

describe('Spotify Client Utilities', () => {
  describe('createSpotifyClient', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('creates a Spotify client with access token', () => {
      const client = createSpotifyClient('test-access-token');

      expect(client).toBeDefined();
      expect(client.setAccessToken).toHaveBeenCalledWith('test-access-token');
    });

    it('sets access token on created client', () => {
      const client = createSpotifyClient('test-token');

      expect(client.setAccessToken).toHaveBeenCalledWith('test-token');
    });

    it('creates new client for each call', () => {
      const client1 = createSpotifyClient('token-1');
      const client2 = createSpotifyClient('token-2');

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client1.setAccessToken).toHaveBeenCalledWith('token-1');
      expect(client2.setAccessToken).toHaveBeenCalledWith('token-2');
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;
    let realDateNow: () => number;

    beforeEach(() => {
      rateLimiter = new RateLimiter();
      realDateNow = Date.now;
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      Date.now = realDateNow;
    });

    it('executes a single task', async () => {
      const task = vi.fn().mockResolvedValue('result');

      const result = await rateLimiter.execute(task);

      expect(result).toBe('result');
      expect(task).toHaveBeenCalledTimes(1);
    });

    it('executes multiple tasks sequentially', async () => {
      const results: number[] = [];
      const task1 = vi.fn().mockImplementation(async () => {
        results.push(1);
        return 1;
      });
      const task2 = vi.fn().mockImplementation(async () => {
        results.push(2);
        return 2;
      });
      const task3 = vi.fn().mockImplementation(async () => {
        results.push(3);
        return 3;
      });

      const promise1 = rateLimiter.execute(task1);
      const promise2 = rateLimiter.execute(task2);
      const promise3 = rateLimiter.execute(task3);

      await Promise.all([promise1, promise2, promise3]);

      expect(results).toEqual([1, 2, 3]);
      expect(task1).toHaveBeenCalled();
      expect(task2).toHaveBeenCalled();
      expect(task3).toHaveBeenCalled();
    });

    it('returns task result', async () => {
      const task = vi.fn().mockResolvedValue({ data: 'test', status: 200 });

      const result = await rateLimiter.execute(task);

      expect(result).toEqual({ data: 'test', status: 200 });
    });

    it('propagates task errors', async () => {
      const error = new Error('Task failed');
      const task = vi.fn().mockRejectedValue(error);

      await expect(rateLimiter.execute(task)).rejects.toThrow('Task failed');
    });

    it('continues processing queue after error', async () => {
      const task1 = vi.fn().mockRejectedValue(new Error('Fail'));
      const task2 = vi.fn().mockResolvedValue('success');

      const promise1 = rateLimiter.execute(task1).catch(() => 'caught');
      const promise2 = rateLimiter.execute(task2);

      await Promise.all([promise1, promise2]);

      expect(task1).toHaveBeenCalled();
      expect(task2).toHaveBeenCalled();
      expect(await promise2).toBe('success');
    });

    it('handles async tasks', async () => {
      const task = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'async-result';
      });

      const promise = rateLimiter.execute(task);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('async-result');
    });

    it('processes queue only once at a time', async () => {
      let processing = false;
      const task = vi.fn().mockImplementation(async () => {
        expect(processing).toBe(false);
        processing = true;
        await new Promise((resolve) => setTimeout(resolve, 10));
        processing = false;
      });

      const promises = [
        rateLimiter.execute(task),
        rateLimiter.execute(task),
        rateLimiter.execute(task),
      ];

      await vi.advanceTimersByTimeAsync(50);
      await Promise.all(promises);

      expect(task).toHaveBeenCalledTimes(3);
    });

    it('handles concurrent execute calls', async () => {
      const task1 = vi.fn().mockResolvedValue(1);
      const task2 = vi.fn().mockResolvedValue(2);
      const task3 = vi.fn().mockResolvedValue(3);

      // Start all tasks concurrently
      const [result1, result2, result3] = await Promise.all([
        rateLimiter.execute(task1),
        rateLimiter.execute(task2),
        rateLimiter.execute(task3),
      ]);

      expect(result1).toBe(1);
      expect(result2).toBe(2);
      expect(result3).toBe(3);
    });

    it('maintains FIFO order', async () => {
      const executionOrder: number[] = [];

      const tasks = Array.from({ length: 5 }, (_, i) =>
        vi.fn().mockImplementation(async () => {
          executionOrder.push(i);
          return i;
        })
      );

      await Promise.all(tasks.map((task) => rateLimiter.execute(task)));

      expect(executionOrder).toEqual([0, 1, 2, 3, 4]);
    });

    it('handles mixed successful and failed tasks', async () => {
      const successTask = vi.fn().mockResolvedValue('success');
      const failTask = vi.fn().mockRejectedValue(new Error('fail'));

      const results = await Promise.allSettled([
        rateLimiter.execute(successTask),
        rateLimiter.execute(failTask),
        rateLimiter.execute(successTask),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    it('supports different return types', async () => {
      const stringTask = vi.fn().mockResolvedValue('string');
      const numberTask = vi.fn().mockResolvedValue(42);
      const objectTask = vi.fn().mockResolvedValue({ key: 'value' });
      const arrayTask = vi.fn().mockResolvedValue([1, 2, 3]);

      const [str, num, obj, arr] = await Promise.all([
        rateLimiter.execute(stringTask),
        rateLimiter.execute(numberTask),
        rateLimiter.execute(objectTask),
        rateLimiter.execute(arrayTask),
      ]);

      expect(str).toBe('string');
      expect(num).toBe(42);
      expect(obj).toEqual({ key: 'value' });
      expect(arr).toEqual([1, 2, 3]);
    });

    it('handles void tasks', async () => {
      const voidTask = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.execute(voidTask);

      expect(result).toBeUndefined();
      expect(voidTask).toHaveBeenCalled();
    });

    it('queues tasks when processing is active', async () => {
      const task1 = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('1'), 100))
      );
      const task2 = vi.fn().mockResolvedValue('2');

      const promise1 = rateLimiter.execute(task1);
      // Start second task while first is processing
      const promise2 = rateLimiter.execute(task2);

      // First task should start immediately
      expect(task1).toHaveBeenCalled();
      // Second task should not start yet
      expect(task2).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);
      await promise1;

      // Now second task should be called
      await promise2;
      expect(task2).toHaveBeenCalled();
    });

    it('does not start processing empty queue', async () => {
      const task = vi.fn().mockResolvedValue('result');

      await rateLimiter.execute(task);

      // Queue should be empty now, calling processQueue again should do nothing
      expect(task).toHaveBeenCalledTimes(1);
    });
  });

  describe('RateLimiter edge cases', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter();
    });

    it('handles task that returns null', async () => {
      const task = vi.fn().mockResolvedValue(null);

      const result = await rateLimiter.execute(task);

      expect(result).toBeNull();
    });

    it('handles task that returns false', async () => {
      const task = vi.fn().mockResolvedValue(false);

      const result = await rateLimiter.execute(task);

      expect(result).toBe(false);
    });

    it('handles task that returns 0', async () => {
      const task = vi.fn().mockResolvedValue(0);

      const result = await rateLimiter.execute(task);

      expect(result).toBe(0);
    });

    it('handles task that returns empty string', async () => {
      const task = vi.fn().mockResolvedValue('');

      const result = await rateLimiter.execute(task);

      expect(result).toBe('');
    });

    it('handles task that throws synchronously', async () => {
      const task = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(rateLimiter.execute(task)).rejects.toThrow('Sync error');
    });
  });
});
