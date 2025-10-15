import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import { Server as SocketIOServer } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents, SocketData } from "@/types/websocket";
import { WS_EVENTS } from "./events";

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> | null = null;

/**
 * Initialize Socket.IO server
 */
export function initializeSocketIO(server: HTTPServer | HTTPSServer) {
  if (io) {
    console.log("[WebSocket] Socket.IO already initialized");
    return io;
  }

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, {
    path: "/api/socketio",
    cors: {
      origin: process.env.NEXTAUTH_URL || "https://dev.local:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Handle joining a session
    socket.on(WS_EVENTS.JOIN_SESSION, (sessionId, callback) => {
      try {
        // Join the session room
        socket.join(sessionId);

        // Store session info in socket data
        socket.data.sessionId = sessionId;

        console.log(`[WebSocket] Socket ${socket.id} joined session: ${sessionId}`);

        // Send success callback
        if (callback) callback(true);
      } catch (error) {
        console.error(`[WebSocket] Error joining session:`, error);
        if (callback) callback(false);
      }
    });

    // Handle leaving a session
    socket.on(WS_EVENTS.LEAVE_SESSION, (sessionId) => {
      socket.leave(sessionId);
      console.log(`[WebSocket] Socket ${socket.id} left session: ${sessionId}`);
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  console.log("[WebSocket] Socket.IO server initialized");
  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
  if (!io) {
    throw new Error("[WebSocket] Socket.IO not initialized. Call initializeSocketIO first.");
  }
  return io;
}

/**
 * Broadcast an event to all clients in a session room
 */
export function broadcastToSession<E extends keyof ServerToClientEvents>(
  sessionId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  if (!io) {
    console.warn(`[WebSocket] Cannot broadcast ${event}: Socket.IO not initialized`);
    return;
  }

  // @ts-expect-error - TypeScript struggles with variadic generic parameters
  io.to(sessionId).emit(event, ...args);
  console.log(`[WebSocket] Broadcasted ${event} to session: ${sessionId}`);
}
