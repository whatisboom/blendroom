import { beforeEach, afterEach, vi } from 'vitest';

/**
 * Standard test lifecycle hooks for component tests.
 * Ensures proper cleanup of mocks, timers, and globals between tests.
 *
 * Usage:
 * ```typescript
 * import { useStandardTestLifecycle } from '../utils/test-lifecycle';
 *
 * describe('MyComponent', () => {
 *   useStandardTestLifecycle();
 *
 *   // Your tests...
 * });
 * ```
 */
export function useStandardTestLifecycle(): void {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}

/**
 * Lifecycle hooks for tests using fake timers.
 * Automatically sets up and tears down fake timers.
 *
 * Usage:
 * ```typescript
 * import { useTimerTestLifecycle } from '../utils/test-lifecycle';
 *
 * describe('Component with timers', () => {
 *   useTimerTestLifecycle();
 *
 *   // Your tests can use vi.advanceTimersByTime(), etc.
 * });
 * ```
 */
export function useTimerTestLifecycle(): void {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}
