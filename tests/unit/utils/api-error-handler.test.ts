import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isSpotifyError,
  getErrorMessage,
  getErrorStatusCode,
  logErrorDetails,
  createErrorResponse,
  withErrorHandling,
  type SpotifyError,
} from '@/lib/utils/api-error-handler';

describe('API Error Handler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('isSpotifyError', () => {
    it('returns true for error with statusCode', () => {
      const error: SpotifyError = { statusCode: 401 };
      expect(isSpotifyError(error)).toBe(true);
    });

    it('returns true for error with body', () => {
      const error: SpotifyError = {
        body: { error: { status: 401, message: 'Unauthorized' } },
      };
      expect(isSpotifyError(error)).toBe(true);
    });

    it('returns true for error with both statusCode and body', () => {
      const error: SpotifyError = {
        statusCode: 401,
        body: { error: { status: 401, message: 'Unauthorized' } },
      };
      expect(isSpotifyError(error)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSpotifyError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSpotifyError(undefined)).toBe(false);
    });

    it('returns false for plain Error', () => {
      const error = new Error('Test error');
      expect(isSpotifyError(error)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isSpotifyError('error message')).toBe(false);
    });

    it('returns false for object without statusCode or body', () => {
      const error = { message: 'Test error' };
      expect(isSpotifyError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('extracts message from Spotify error body', () => {
      const error: SpotifyError = {
        body: { error: { status: 401, message: 'Token expired' } },
      };
      expect(getErrorMessage(error)).toBe('Token expired');
    });

    it('falls back to error.message for Spotify error', () => {
      const error: SpotifyError = {
        statusCode: 401,
        message: 'Unauthorized',
      };
      expect(getErrorMessage(error)).toBe('Unauthorized');
    });

    it('falls back to default for Spotify error without message', () => {
      const error: SpotifyError = { statusCode: 401 };
      expect(getErrorMessage(error)).toBe('Spotify API error');
    });

    it('extracts message from standard Error', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('returns default message for unknown error', () => {
      expect(getErrorMessage('random string')).toBe('Internal server error');
      expect(getErrorMessage(123)).toBe('Internal server error');
      expect(getErrorMessage(null)).toBe('Internal server error');
    });

    it('prioritizes body.error.message over error.message', () => {
      const error: SpotifyError = {
        message: 'Generic message',
        body: { error: { message: 'Specific message' } },
      };
      expect(getErrorMessage(error)).toBe('Specific message');
    });
  });

  describe('getErrorStatusCode', () => {
    it('extracts statusCode from Spotify error', () => {
      const error: SpotifyError = { statusCode: 401 };
      expect(getErrorStatusCode(error)).toBe(401);
    });

    it('extracts status from Spotify error body', () => {
      const error: SpotifyError = {
        body: { error: { status: 403 } },
      };
      expect(getErrorStatusCode(error)).toBe(403);
    });

    it('prioritizes statusCode over body.error.status', () => {
      const error: SpotifyError = {
        statusCode: 401,
        body: { error: { status: 403 } },
      };
      expect(getErrorStatusCode(error)).toBe(401);
    });

    it('defaults to 400 for Spotify error without status', () => {
      const error: SpotifyError = {
        body: { error: { message: 'Bad request' } },
      };
      expect(getErrorStatusCode(error)).toBe(400);
    });

    it('returns 500 for standard Error', () => {
      const error = new Error('Something went wrong');
      expect(getErrorStatusCode(error)).toBe(500);
    });

    it('returns 500 for unknown error', () => {
      expect(getErrorStatusCode('random string')).toBe(500);
      expect(getErrorStatusCode(null)).toBe(500);
    });
  });

  describe('logErrorDetails', () => {
    it('logs Spotify error details', () => {
      const error: SpotifyError = {
        statusCode: 401,
        message: 'Unauthorized',
        body: { error: { status: 401, message: 'Token expired' } },
      };

      logErrorDetails('Test Context', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Test Context] Error:', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Test Context] Spotify error details:',
        {
          statusCode: 401,
          message: 'Unauthorized',
          body: { error: { status: 401, message: 'Token expired' } },
        }
      );
    });

    it('logs standard Error details', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logErrorDetails('Test Context', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Test Context] Error:', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Test Context] Error details:', {
        message: 'Test error',
        stack: 'Error stack trace',
      });
    });

    it('logs unknown error', () => {
      const error = 'random error';

      logErrorDetails('Test Context', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Test Context] Error:', error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('includes context in logs', () => {
      const error = new Error('Test');

      logErrorDetails('Queue Generation', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Queue Generation] Error:', error);
    });
  });

  describe('createErrorResponse', () => {
    it('creates response from Spotify error', () => {
      const error: SpotifyError = {
        statusCode: 401,
        body: { error: { message: 'Token expired' } },
      };

      const response = createErrorResponse(error);
      const body = response.json();

      expect(response.status).toBe(401);
      expect(body).resolves.toEqual({ error: 'Token expired' });
    });

    it('creates response from standard Error', () => {
      const error = new Error('Something went wrong');

      const response = createErrorResponse(error);
      const body = response.json();

      expect(response.status).toBe(500);
      expect(body).resolves.toEqual({ error: 'Something went wrong' });
    });

    it('logs error when context provided', () => {
      const error = new Error('Test error');

      createErrorResponse(error, 'Test Context');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('does not log when context not provided', () => {
      const error = new Error('Test error');

      createErrorResponse(error);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('creates response for unknown error', () => {
      const response = createErrorResponse('random error');
      const body = response.json();

      expect(response.status).toBe(500);
      expect(body).resolves.toEqual({ error: 'Internal server error' });
    });

    it('handles various status codes', () => {
      const errors: SpotifyError[] = [
        { statusCode: 400, message: 'Bad Request' },
        { statusCode: 403, message: 'Forbidden' },
        { statusCode: 404, message: 'Not Found' },
        { statusCode: 429, message: 'Too Many Requests' },
        { statusCode: 500, message: 'Server Error' },
      ];

      errors.forEach((error) => {
        const response = createErrorResponse(error);
        expect(response.status).toBe(error.statusCode);
      });
    });
  });

  describe('withErrorHandling', () => {
    it('returns handler result when successful', async () => {
      const handler = async () => ({ success: true, data: 'test' });

      const result = await withErrorHandling(handler, 'Test');

      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('catches and converts errors to error response', async () => {
      const handler = async () => {
        throw new Error('Handler failed');
      };

      const result = await withErrorHandling(handler, 'Test');

      expect(result).toHaveProperty('status', 500);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles Spotify errors', async () => {
      const handler = async () => {
        const error: SpotifyError = {
          statusCode: 401,
          message: 'Unauthorized',
        };
        throw error;
      };

      const result = await withErrorHandling(handler, 'Test');

      expect(result).toHaveProperty('status', 401);
    });

    it('logs error with provided context', async () => {
      const handler = async () => {
        throw new Error('Test error');
      };

      await withErrorHandling(handler, 'Queue Generation');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Queue Generation] Error:',
        expect.any(Error)
      );
    });

    it('preserves async handler behavior', async () => {
      let called = false;
      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        called = true;
        return 'done';
      };

      const result = await withErrorHandling(handler, 'Test');

      expect(called).toBe(true);
      expect(result).toBe('done');
    });

    it('handles synchronous errors in async handler', async () => {
      const handler = async () => {
        throw new Error('Immediate error');
      };

      const result = await withErrorHandling(handler, 'Test');

      expect(result).toHaveProperty('status', 500);
    });
  });

  describe('integration scenarios', () => {
    it('handles Spotify rate limit error', async () => {
      const error: SpotifyError = {
        statusCode: 429,
        body: { error: { status: 429, message: 'Rate limit exceeded' } },
      };

      const response = createErrorResponse(error, 'Spotify API');
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe('Rate limit exceeded');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Spotify API'),
        expect.anything()
      );
    });

    it('handles token expiration error', async () => {
      const error: SpotifyError = {
        statusCode: 401,
        body: { error: { status: 401, message: 'The access token expired' } },
      };

      const response = createErrorResponse(error);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('The access token expired');
    });

    it('handles malformed request error', async () => {
      const error: SpotifyError = {
        statusCode: 400,
        body: { error: { status: 400, message: 'Invalid request parameters' } },
      };

      const response = createErrorResponse(error);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid request parameters');
    });
  });
});
