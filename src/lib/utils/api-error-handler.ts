import { NextResponse } from "next/server";

/**
 * Spotify API error interface
 */
export interface SpotifyError {
  statusCode?: number;
  message?: string;
  body?: {
    error?: {
      status?: number;
      message?: string;
    };
  };
}

/**
 * Check if an error is a Spotify API error
 */
export function isSpotifyError(error: unknown): error is SpotifyError {
  return (
    error !== null &&
    typeof error === 'object' &&
    ('statusCode' in error || 'body' in error)
  );
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Spotify API error
  if (isSpotifyError(error)) {
    return error.body?.error?.message || error.message || "Spotify API error";
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Unknown error
  return "Internal server error";
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  // Spotify API error
  if (isSpotifyError(error)) {
    return error.statusCode || error.body?.error?.status || 400;
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Log error details for debugging
 */
export function logErrorDetails(context: string, error: unknown): void {
  console.error(`[${context}] Error:`, error);

  if (isSpotifyError(error)) {
    console.error(`[${context}] Spotify error details:`, {
      statusCode: error.statusCode,
      message: error.message,
      body: error.body,
    });
  } else if (error instanceof Error) {
    console.error(`[${context}] Error details:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Create a standardized error response for Next.js API routes
 */
export function createErrorResponse(error: unknown, context?: string): NextResponse {
  if (context) {
    logErrorDetails(context, error);
  }

  const message = getErrorMessage(error);
  const statusCode = getErrorStatusCode(error);

  return NextResponse.json(
    { error: message },
    { status: statusCode }
  );
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string
): Promise<T | NextResponse> {
  return handler().catch((error) => {
    return createErrorResponse(error, context);
  });
}
