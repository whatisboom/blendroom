import { Server as HTTPServer } from "http";
import { Server as HTTPSServer } from "https";
import { Server as SocketIOServer } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents, SocketData } from "@/types/websocket";
import { WS_EVENTS } from "./events";
import { subscribeToPattern, publishEvent } from "@/lib/redis-events";

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> | null = null;

/**
 * Valid server-to-client event names
 */
const VALID_EVENTS: readonly (keyof ServerToClientEvents)[] = [
  'participant_joined',
  'participant_left',
  'queue_updated',
  'playback_state_changed',
  'track_skipped',
  'vote_updated',
  'dj_assigned',
  'dj_removed',
  'session_settings_updated',
  'session_ended',
  'error',
] as const;

/**
 * Type guard to validate event names
 */
function isValidEvent(event: string): event is keyof ServerToClientEvents {
  return VALID_EVENTS.includes(event as keyof ServerToClientEvents);
}

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

  // Subscribe to Redis pub/sub for cross-context broadcasting
  subscribeToPattern("session:*", (channel, message) => {
    try {
      // Parse channel to extract sessionId and event
      // Format: session:{sessionId}:{event}
      const parts = channel.split(":");
      if (parts.length !== 3) {
        console.warn(`[WebSocket] Invalid channel format: ${channel}`);
        return;
      }

      const sessionId = parts[1];
      const eventName = parts[2];

      // Validate event name
      if (!isValidEvent(eventName)) {
        console.warn(`[WebSocket] Invalid event name: ${eventName}`);
        return;
      }

      // Parse message data
      const data = JSON.parse(message);

      // Broadcast to Socket.IO room
      if (io) {
        io.to(sessionId).emit(eventName, data);
        console.log(`[WebSocket] Broadcasted ${eventName} to session ${sessionId} via Redis`);
      }
    } catch (error) {
      console.error("[WebSocket] Error handling Redis message:", error);
    }
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
 * Broadcast an event to all clients in a session room via Redis pub/sub
 * This allows API routes to trigger broadcasts without direct access to Socket.IO
 */
export async function broadcastToSession<E extends keyof ServerToClientEvents>(
  sessionId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): Promise<void> {
  try {
    // Publish to Redis - the WebSocket server will pick it up and broadcast
    const channel = `session:${sessionId}:${event}`;
    const data = args[0]; // First argument is the data payload

    await publishEvent(channel, data);
    console.log(`[WebSocket] Published ${event} to Redis channel: ${channel}`);
  } catch (error) {
    console.error(`[WebSocket] Error publishing to Redis:`, error);

    // Fallback: try direct broadcast if io is available (for same-process calls)
    if (io) {
      io.to(sessionId).emit(event, ...args);
      console.log(`[WebSocket] Fallback: Direct broadcast ${event} to session: ${sessionId}`);
    } else {
      console.warn(`[WebSocket] Cannot broadcast ${event}: Redis publish failed and Socket.IO not initialized`);
    }
  }
}
