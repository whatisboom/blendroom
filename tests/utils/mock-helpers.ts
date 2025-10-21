import { beforeEach, afterEach, vi } from 'vitest';

/**
 * Creates a type-safe mock for the global fetch function.
 * Automatically stubs and unstubs the global fetch.
 *
 * Usage:
 * ```typescript
 * import { useFetchMock } from '../utils/mock-helpers';
 *
 * describe('Component with API calls', () => {
 *   const mockFetch = useFetchMock();
 *
 *   it('fetches data', async () => {
 *     mockFetch.mockResolvedValueOnce({
 *       ok: true,
 *       json: async () => ({ data: 'test' }),
 *     } as Response);
 *
 *     // Your test...
 *   });
 * });
 * ```
 */
export function useFetchMock(): ReturnType<typeof vi.fn> {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    mockFetch.mockClear();
    vi.unstubAllGlobals();
  });

  return mockFetch;
}

/**
 * Creates a console.error spy that is automatically cleaned up.
 * Prevents console pollution during tests while allowing error verification.
 *
 * Usage:
 * ```typescript
 * import { useConsoleErrorSpy } from '../utils/mock-helpers';
 *
 * describe('Error handling', () => {
 *   const consoleErrorSpy = useConsoleErrorSpy();
 *
 *   it('logs error to console', async () => {
 *     // Trigger error...
 *     expect(consoleErrorSpy).toHaveBeenCalledWith(
 *       expect.stringContaining('Error message')
 *     );
 *   });
 * });
 * ```
 */
export function useConsoleErrorSpy(): ReturnType<typeof vi.spyOn> {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  return new Proxy({} as ReturnType<typeof vi.spyOn>, {
    get(_, prop) {
      return spy[prop as keyof ReturnType<typeof vi.spyOn>];
    },
  });
}

/**
 * Creates a console.warn spy that is automatically cleaned up.
 * Similar to useConsoleErrorSpy but for warnings.
 */
export function useConsoleWarnSpy(): ReturnType<typeof vi.spyOn> {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  return new Proxy({} as ReturnType<typeof vi.spyOn>, {
    get(_, prop) {
      return spy[prop as keyof ReturnType<typeof vi.spyOn>];
    },
  });
}

/**
 * Helper to create a mock Response object for fetch.
 *
 * Usage:
 * ```typescript
 * mockFetch.mockResolvedValueOnce(
 *   createMockResponse({ data: 'test' }, { status: 200 })
 * );
 * ```
 */
export function createMockResponse<T>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    ok?: boolean;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', ok = status >= 200 && status < 300, headers = {} } = options;

  return {
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(data)).buffer,
    formData: async () => new FormData(),
    clone: function () {
      return this;
    },
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
  } as Response;
}

/**
 * Helper to create a mock error Response object for fetch.
 *
 * Usage:
 * ```typescript
 * mockFetch.mockResolvedValueOnce(
 *   createMockErrorResponse('Not found', { status: 404 })
 * );
 * ```
 */
export function createMockErrorResponse(
  message: string,
  options: {
    status?: number;
    statusText?: string;
  } = {}
): Response {
  const { status = 500, statusText = 'Internal Server Error' } = options;

  return createMockResponse(
    { error: message },
    {
      status,
      statusText,
      ok: false,
    }
  );
}
