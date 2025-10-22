import LogRocket from 'logrocket';

/**
 * LogRocket configuration and utilities
 * Provides session recording, error tracking, and custom event logging
 */

let isInitialized = false;

/**
 * Type matching LogRocket's IUserTraits interface
 * Does not allow undefined values
 */
type LogRocketUserTraits = {
  [propName: string]: string | number | boolean;
};

/**
 * Type for user traits that can be passed to identifyUser
 * Allows undefined and null values which will be filtered out before passing to LogRocket
 */
type UserTraitValue = string | number | boolean | undefined | null;

/**
 * Type for event properties that can be passed to trackEvent
 * Matches LogRocket's TrackEventProperties type
 */
type EventPropertyValue = string | number | boolean | string[] | number[] | boolean[] | null | undefined;

/**
 * Helper function to filter out undefined and null values from an object
 * Returns an object that matches LogRocketUserTraits (no undefined or null values)
 */
function filterUndefinedValues<T extends Record<string, UserTraitValue>>(
  obj: T
): LogRocketUserTraits {
  const result: LogRocketUserTraits = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Initialize LogRocket (client-side only)
 * Safe to call multiple times - will only initialize once
 */
export function initializeLogRocket(): void {
  // Only run on client side
  if (typeof window === 'undefined') {
    return;
  }

  // Only initialize once
  if (isInitialized) {
    return;
  }

  const appId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;

  if (!appId) {
    console.warn('[LogRocket] App ID not configured. Session recording disabled.');
    return;
  }

  try {
    LogRocket.init(appId, {
      // Network request sanitization
      network: {
        requestSanitizer: (request) => {
          // Remove authorization headers and sensitive tokens
          if (request.headers) {
            delete request.headers['authorization'];
            delete request.headers['Authorization'];
          }

          // Sanitize URLs containing tokens
          if (request.url.includes('access_token') || request.url.includes('refresh_token')) {
            request.url = request.url.replace(/([?&])(access_token|refresh_token)=[^&]*/g, '$1$2=REDACTED');
          }

          return request;
        },
        responseSanitizer: (response) => {
          // Sanitize response bodies that might contain tokens
          if (response.body && typeof response.body === 'string') {
            try {
              const parsed = JSON.parse(response.body);
              if (parsed.accessToken) parsed.accessToken = 'REDACTED';
              if (parsed.refreshToken) parsed.refreshToken = 'REDACTED';
              if (parsed.access_token) parsed.access_token = 'REDACTED';
              if (parsed.refresh_token) parsed.refresh_token = 'REDACTED';
              response.body = JSON.stringify(parsed);
            } catch {
              // Not JSON, leave as is
            }
          }
          return response;
        },
      },
      // Console log sanitization
      console: {
        shouldAggregateConsoleErrors: true,
      },
      // DOM recording options
      dom: {
        inputSanitizer: true, // Automatically sanitize input values
      },
    });

    isInitialized = true;
    console.log('[LogRocket] Initialized successfully');
  } catch (error) {
    console.error('[LogRocket] Initialization failed:', error);
  }
}

/**
 * Identify a user in LogRocket
 * Call this after user authentication
 *
 * @param userId - Unique identifier for the user
 * @param traits - Optional user traits (undefined and null values will be filtered out)
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, UserTraitValue>
): void {
  if (!isInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    const filteredTraits: LogRocketUserTraits | undefined = traits
      ? filterUndefinedValues(traits)
      : undefined;

    LogRocket.identify(userId, filteredTraits);
    console.log('[LogRocket] User identified:', userId);
  } catch (error) {
    console.error('[LogRocket] User identification failed:', error);
  }
}

/**
 * Track a custom event
 *
 * @param eventName - Name of the event to track
 * @param properties - Optional event properties
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, EventPropertyValue>
): void {
  if (!isInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    LogRocket.track(eventName, properties);
  } catch (error) {
    console.error('[LogRocket] Event tracking failed:', error);
  }
}

/**
 * Track an error with additional context
 *
 * @param error - Error to track
 * @param context - Optional context tags
 */
export function trackError(
  error: Error | unknown,
  context?: Record<string, string | number | boolean>
): void {
  if (!isInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    if (error instanceof Error) {
      LogRocket.captureException(error, {
        tags: context,
      });
    } else {
      LogRocket.captureMessage(String(error), {
        tags: context,
      });
    }
  } catch (err) {
    console.error('[LogRocket] Error tracking failed:', err);
  }
}

/**
 * Track an API error
 */
export function trackApiError(
  endpoint: string,
  method: string,
  error: Error | unknown,
  statusCode?: number
): void {
  if (!isInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    const errorMessage = error instanceof Error ? error.message : String(error);

    LogRocket.track('api_error', {
      endpoint,
      method,
      error: errorMessage,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[LogRocket] API error tracking failed:', err);
  }
}

/**
 * Get the current LogRocket session URL
 * Useful for support tickets or error reports
 */
export function getSessionURL(): string | null {
  if (!isInitialized || typeof window === 'undefined') {
    return null;
  }

  try {
    return LogRocket.sessionURL;
  } catch {
    return null;
  }
}
