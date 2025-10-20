import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/websocket";
import { WS_EVENTS } from "@/lib/websocket/events";

interface UseSocketOptions {
  sessionId?: string;
  autoConnect?: boolean;
}

export function useSocket({ sessionId, autoConnect = true }: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Initialize socket connection
    const socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("[useSocket] Connected to WebSocket server");
      setIsConnected(true);

      // Auto-join session if sessionId is provided
      if (sessionId) {
        socket.emit(WS_EVENTS.JOIN_SESSION, sessionId, (success: boolean) => {
          if (success) {
            console.log(`[useSocket] Joined session: ${sessionId}`);
            setIsJoined(true);
          } else {
            console.error(`[useSocket] Failed to join session: ${sessionId}`);
            setIsJoined(false);
          }
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[useSocket] Disconnected: ${reason}`);
      setIsConnected(false);
      setIsJoined(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[useSocket] Connection error:", error);
      setIsConnected(false);
      setIsJoined(false);
    });

    // Cleanup on unmount
    return () => {
      if (sessionId && socket.connected) {
        socket.emit(WS_EVENTS.LEAVE_SESSION, sessionId);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, autoConnect]);

  // Re-join session if sessionId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !sessionId) return;

    socket.emit(WS_EVENTS.JOIN_SESSION, sessionId, (success: boolean) => {
      if (success) {
        console.log(`[useSocket] Joined session: ${sessionId}`);
        setIsJoined(true);
      } else {
        console.error(`[useSocket] Failed to join session: ${sessionId}`);
        setIsJoined(false);
      }
    });

    return () => {
      if (socket.connected) {
        socket.emit(WS_EVENTS.LEAVE_SESSION, sessionId);
        setIsJoined(false);
      }
    };
  }, [sessionId]);

  return {
    socket: socketRef.current,
    isConnected,
    isJoined,
  };
}
