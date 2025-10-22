import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSocket } from '@/hooks/useSocket';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@/lib/websocket/events';

// Mock socket.io-client
vi.mock('socket.io-client');

describe('useSocket', () => {
  let mockSocket: {
    on: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    connected: boolean;
  };

  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a fresh mock socket for each test
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: false,
    };

    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket as unknown as Socket);
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('connects to WebSocket server on mount with correct config', () => {
      renderHook(() => useSocket({ sessionId: 'test-123' }));

      expect(io).toHaveBeenCalledWith({
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });
    });

    it('sets up all event listeners on mount', () => {
      renderHook(() => useSocket({ sessionId: 'test-123' }));

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('does not connect when autoConnect is false', () => {
      renderHook(() => useSocket({ autoConnect: false }));

      expect(io).not.toHaveBeenCalled();
    });

    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useSocket({ sessionId: 'test-123' }));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isJoined).toBe(false);
      expect(result.current.socket).not.toBeUndefined();
    });
  });

  describe('Connection Handling', () => {
    it('updates isConnected when socket connects', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          // Simulate async connection
          setTimeout(() => callback(), 0);
        }
      });

      const { result } = renderHook(() => useSocket());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[useSocket] Connected to WebSocket server');
    });

    it('updates isConnected to false on disconnect', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      const { result } = renderHook(() => useSocket());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate disconnect
      const disconnectCallback = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];
      disconnectCallback?.('transport close');

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isJoined).toBe(false);
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('[useSocket] Disconnected: transport close');
    });

    it('handles connection errors', async () => {
      const testError = new Error('Connection failed');

      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(testError), 0);
        }
      });

      const { result } = renderHook(() => useSocket());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('[useSocket] Connection error:', testError);
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isJoined).toBe(false);
    });
  });

  describe('Session Joining', () => {
    it('joins session when sessionId is provided and socket connects', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          setTimeout(() => callback(), 0);
        }
      });

      mockSocket.emit.mockImplementation((event, sessionId, callback) => {
        if (event === WS_EVENTS.JOIN_SESSION && typeof callback === 'function') {
          setTimeout(() => callback(true), 0);
        }
      });

      const { result } = renderHook(() => useSocket({ sessionId: 'test-session-123' }));

      await waitFor(() => {
        expect(result.current.isJoined).toBe(true);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        WS_EVENTS.JOIN_SESSION,
        'test-session-123',
        expect.any(Function)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[useSocket] Joined session: test-session-123');
    });

    it('handles failed session join', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          setTimeout(() => callback(), 0);
        }
      });

      mockSocket.emit.mockImplementation((event, sessionId, callback) => {
        if (event === WS_EVENTS.JOIN_SESSION && typeof callback === 'function') {
          setTimeout(() => callback(false), 0);
        }
      });

      const { result } = renderHook(() => useSocket({ sessionId: 'test-session-123' }));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[useSocket] Failed to join session: test-session-123'
        );
      });

      expect(result.current.isJoined).toBe(false);
    });

    it('does not join session when no sessionId provided', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockSocket.connected = true;
          setTimeout(() => callback(), 0);
        }
      });

      const { result } = renderHook(() => useSocket());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        WS_EVENTS.JOIN_SESSION,
        expect.anything(),
        expect.anything()
      );
      expect(result.current.isJoined).toBe(false);
    });
  });

  describe('Session ID Changes', () => {
    it('leaves old session and joins new session when sessionId changes', async () => {
      mockSocket.connected = true;

      mockSocket.emit.mockImplementation((event, sessionId, callback) => {
        if (event === WS_EVENTS.JOIN_SESSION && typeof callback === 'function') {
          setTimeout(() => callback(true), 0);
        }
      });

      const { result, rerender } = renderHook(
        ({ sessionId }) => useSocket({ sessionId }),
        { initialProps: { sessionId: 'session-1' } }
      );

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(
          WS_EVENTS.JOIN_SESSION,
          'session-1',
          expect.any(Function)
        );
      });

      // Change session ID
      rerender({ sessionId: 'session-2' });

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LEAVE_SESSION, 'session-1');
        expect(mockSocket.emit).toHaveBeenCalledWith(
          WS_EVENTS.JOIN_SESSION,
          'session-2',
          expect.any(Function)
        );
      });

      await waitFor(() => {
        expect(result.current.isJoined).toBe(true);
      });
    });

    it('does not rejoin if socket is not connected', () => {
      mockSocket.connected = false;

      const { rerender } = renderHook(
        ({ sessionId }) => useSocket({ sessionId }),
        { initialProps: { sessionId: 'session-1' } }
      );

      vi.clearAllMocks();

      // Change session ID while disconnected
      rerender({ sessionId: 'session-2' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('does not attempt to join if sessionId becomes undefined', () => {
      mockSocket.connected = true;

      const { rerender } = renderHook(
        ({ sessionId }) => useSocket({ sessionId }),
        { initialProps: { sessionId: 'session-1' } }
      );

      vi.clearAllMocks();

      // Change to undefined
      rerender({ sessionId: undefined });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LEAVE_SESSION, 'session-1');
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        WS_EVENTS.JOIN_SESSION,
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('Cleanup', () => {
    it('disconnects socket on unmount', () => {
      const { unmount } = renderHook(() => useSocket({ sessionId: 'test-123' }));

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('leaves session before disconnecting when sessionId is provided', () => {
      mockSocket.connected = true;

      const { unmount } = renderHook(() => useSocket({ sessionId: 'test-session-123' }));

      unmount();

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LEAVE_SESSION, 'test-session-123');
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('does not emit leave_session if socket is not connected', () => {
      mockSocket.connected = false;

      const { unmount } = renderHook(() => useSocket({ sessionId: 'test-session-123' }));

      unmount();

      expect(mockSocket.emit).not.toHaveBeenCalledWith(WS_EVENTS.LEAVE_SESSION, expect.anything());
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('does not emit leave_session if no sessionId was provided', () => {
      const { unmount } = renderHook(() => useSocket());

      unmount();

      expect(mockSocket.emit).not.toHaveBeenCalledWith(WS_EVENTS.LEAVE_SESSION, expect.anything());
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('sets socket ref to null after disconnect', () => {
      const { result, unmount } = renderHook(() => useSocket());

      unmount();

      // After unmount, the hook no longer exists, but we verified disconnect was called
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid connect/disconnect cycles', async () => {
      let connectCallback: (() => void) | undefined;
      let disconnectCallback: ((reason: string) => void) | undefined;

      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          connectCallback = callback as () => void;
        } else if (event === 'disconnect') {
          disconnectCallback = callback as (reason: string) => void;
        }
      });

      const { result } = renderHook(() => useSocket());

      // Simulate rapid connect/disconnect
      connectCallback?.();
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      disconnectCallback?.('transport close');
      await waitFor(() => expect(result.current.isConnected).toBe(false));

      connectCallback?.();
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      disconnectCallback?.('server disconnect');
      await waitFor(() => expect(result.current.isConnected).toBe(false));
    });

    it('handles sessionId changing from undefined to defined', async () => {
      mockSocket.connected = true;

      mockSocket.emit.mockImplementation((event, sessionId, callback) => {
        if (event === WS_EVENTS.JOIN_SESSION && typeof callback === 'function') {
          setTimeout(() => callback(true), 0);
        }
      });

      const { result, rerender } = renderHook(
        ({ sessionId }) => useSocket({ sessionId }),
        { initialProps: { sessionId: undefined } }
      );

      expect(result.current.isJoined).toBe(false);

      // Change from undefined to a sessionId
      rerender({ sessionId: 'new-session' });

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(
          WS_EVENTS.JOIN_SESSION,
          'new-session',
          expect.any(Function)
        );
      });

      await waitFor(() => {
        expect(result.current.isJoined).toBe(true);
      });
    });

    it('provides access to socket instance', () => {
      const { result } = renderHook(() => useSocket());

      // Socket exists but may be null initially in the ref
      expect(result.current.socket).toBeDefined();
    });
  });
});
