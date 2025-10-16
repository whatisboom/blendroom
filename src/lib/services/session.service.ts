import { Session, Participant, SessionSettings } from "@/types";
import { SessionStore } from "../session/store.interface";
import { generateSessionCode } from "../utils/session-code";
import { nanoid } from "nanoid";
import { TasteAnalysisService } from "./taste-analysis.service";
import { QueueGenerationService } from "./queue-generation.service";
import { MAX_QUEUE_SIZE } from "../constants";

/**
 * Service for managing sessions
 */
export class SessionService {
  private store: SessionStore;
  private tasteAnalysisService: TasteAnalysisService;
  private queueGenerationService: QueueGenerationService;
  private accessToken: string;

  constructor(store: SessionStore, accessToken: string) {
    this.store = store;
    this.accessToken = accessToken;
    this.tasteAnalysisService = new TasteAnalysisService(accessToken);
    this.queueGenerationService = new QueueGenerationService(accessToken);
  }

  /**
   * Create a new session
   */
  async createSession(
    hostId: string,
    hostName: string,
    options?: {
      settings?: Partial<SessionSettings>;
      customCode?: string; // Optional custom join code (premium feature)
    }
  ): Promise<Session> {
    const sessionId = nanoid();

    // Use custom code if provided, otherwise generate one
    let code: string;
    if (options?.customCode) {
      code = this.validateCustomCode(options.customCode);
      // Check if custom code is already in use
      const existing = await this.store.getByCode(code);
      if (existing) {
        throw new Error("This code is already in use. Please choose a different one.");
      }
    } else {
      code = await this.generateUniqueCode();
    }

    const defaultSettings: SessionSettings = {
      voteToSkip: true,
      skipThreshold: Math.ceil(1 / 2), // 50% of participants
      ...options?.settings,
    };

    const host: Participant = {
      userId: hostId,
      name: hostName,
      joinedAt: Date.now(),
      isHost: true,
      isDJ: true,
    };

    const session: Session = {
      id: sessionId,
      code,
      hostId,
      participants: [host],
      djs: [hostId],
      settings: defaultSettings,
      queue: [],
      playedTracks: [],
      votes: {
        skip: [],
        like: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastParticipantChange: Date.now(),
    };

    await this.store.set(sessionId, session);

    // Generate initial profile
    await this.updateSessionProfile(sessionId);

    // Generate initial queue
    try {
      const updatedSession = await this.store.get(sessionId);
      if (updatedSession && updatedSession.profile) {
        const initialQueue = await this.queueGenerationService.generateQueue(
          updatedSession,
          MAX_QUEUE_SIZE
        );
        updatedSession.queue = initialQueue;
        updatedSession.updatedAt = Date.now();
        await this.store.set(sessionId, updatedSession);
        console.log(`Generated initial queue with ${initialQueue.length} tracks`);
        return updatedSession;
      }
    } catch (error) {
      console.error("Failed to generate initial queue:", error);
      // Continue without queue - will be generated later
    }

    return session;
  }

  /**
   * Join an existing session
   */
  async joinSession(
    code: string,
    userId: string,
    userName: string
  ): Promise<Session> {
    const session = await this.store.getByCode(code);

    if (!session) {
      throw new Error("Session not found");
    }

    // Check if user is already in session
    const existingParticipant = session.participants.find(
      (p) => p.userId === userId
    );

    if (existingParticipant) {
      return session;
    }

    // Add participant
    const participant: Participant = {
      userId,
      name: userName,
      joinedAt: Date.now(),
      isHost: false,
      isDJ: false,
    };

    session.participants.push(participant);
    session.updatedAt = Date.now();
    session.lastParticipantChange = Date.now();

    // Update skip threshold based on new participant count
    if (session.settings.voteToSkip) {
      session.settings.skipThreshold = Math.ceil(
        session.participants.length / 2
      );
    }

    await this.store.set(session.id, session);

    // Trigger profile update (background)
    this.updateSessionProfile(session.id).catch((err) =>
      console.error("Failed to update session profile:", err)
    );

    return session;
  }

  /**
   * Leave a session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.store.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    // Remove participant
    session.participants = session.participants.filter(
      (p) => p.userId !== userId
    );

    // Remove from DJs if applicable
    session.djs = session.djs.filter((id) => id !== userId);

    // Remove user's votes
    session.votes.skip = session.votes.skip.filter((v) => v.userId !== userId);
    session.votes.like = session.votes.like.filter((v) => v.userId !== userId);

    session.updatedAt = Date.now();
    session.lastParticipantChange = Date.now();

    // If host left and there are still participants, assign new host
    if (userId === session.hostId && session.participants.length > 0) {
      const newHost = session.participants[0];
      session.hostId = newHost.userId;
      newHost.isHost = true;
      newHost.isDJ = true;
      if (!session.djs.includes(newHost.userId)) {
        session.djs.push(newHost.userId);
      }
    }

    // If no participants left, delete session
    if (session.participants.length === 0) {
      await this.store.delete(sessionId);
      return;
    }

    // Update skip threshold
    if (session.settings.voteToSkip) {
      session.settings.skipThreshold = Math.ceil(
        session.participants.length / 2
      );
    }

    await this.store.set(sessionId, session);

    // Trigger profile update (background)
    this.updateSessionProfile(sessionId).catch((err) =>
      console.error("Failed to update session profile:", err)
    );
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return this.store.get(sessionId);
  }

  /**
   * Get a session by code
   */
  async getSessionByCode(code: string): Promise<Session | null> {
    return this.store.getByCode(code);
  }

  /**
   * Delete a session (host only)
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.store.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.hostId !== userId) {
      throw new Error("Only the host can delete the session");
    }

    await this.store.delete(sessionId);
  }

  /**
   * Update session settings (host only)
   */
  async updateSettings(
    sessionId: string,
    userId: string,
    settings: Partial<SessionSettings>
  ): Promise<Session> {
    const session = await this.store.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.hostId !== userId) {
      throw new Error("Only the host can update settings");
    }

    session.settings = {
      ...session.settings,
      ...settings,
    };

    session.updatedAt = Date.now();

    await this.store.set(sessionId, session);

    return session;
  }

  /**
   * Add or remove DJ privileges (host only)
   */
  async manageDJ(
    sessionId: string,
    hostId: string,
    targetUserId: string,
    action: "add" | "remove"
  ): Promise<Session> {
    const session = await this.store.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.hostId !== hostId) {
      throw new Error("Only the host can manage DJ privileges");
    }

    // Can't remove host's DJ privileges
    if (targetUserId === hostId && action === "remove") {
      throw new Error("Cannot remove DJ privileges from host");
    }

    // Check if target user is in session
    const participant = session.participants.find(
      (p) => p.userId === targetUserId
    );

    if (!participant) {
      throw new Error("User not in session");
    }

    if (action === "add") {
      if (!session.djs.includes(targetUserId)) {
        session.djs.push(targetUserId);
        participant.isDJ = true;
      }
    } else {
      session.djs = session.djs.filter((id) => id !== targetUserId);
      participant.isDJ = false;
    }

    session.updatedAt = Date.now();

    await this.store.set(sessionId, session);

    return session;
  }

  /**
   * Update session profile based on participants
   */
  async updateSessionProfile(sessionId: string): Promise<void> {
    const session = await this.store.get(sessionId);

    if (!session) {
      return;
    }

    try {
      console.log(`Updating profile for session ${sessionId} with ${session.participants.length} participants`);
      const profile = await this.tasteAnalysisService.generateSessionProfile(
        session.participants
      );

      session.profile = profile;
      session.updatedAt = Date.now();

      await this.store.set(sessionId, session);
      console.log(`Successfully updated profile for session ${sessionId}`);
    } catch (error) {
      console.error("Failed to update session profile:", error);
      // Log more details about the error
      if (error && typeof error === 'object') {
        console.error("Error details:", {
          // @ts-expect-error - accessing error properties
          statusCode: error.statusCode,
          // @ts-expect-error - accessing error properties
          message: error.message,
          // @ts-expect-error - accessing error properties
          body: error.body,
        });
      }
      throw error;
    }
  }

  /**
   * Validate custom code format
   * - Must be 4-12 characters
   * - Only alphanumeric and hyphens
   * - Case insensitive (converted to uppercase)
   */
  private validateCustomCode(code: string): string {
    const normalized = code.trim().toUpperCase();

    if (normalized.length < 4 || normalized.length > 12) {
      throw new Error("Code must be between 4 and 12 characters");
    }

    if (!/^[A-Z0-9-]+$/.test(normalized)) {
      throw new Error("Code can only contain letters, numbers, and hyphens");
    }

    return normalized;
  }

  /**
   * Generate a unique session code (auto-generated)
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      code = generateSessionCode();
      exists = (await this.store.getByCode(code)) !== null;
    }

    return code!;
  }

  /**
   * Check if user is host
   */
  isHost(session: Session, userId: string): boolean {
    return session.hostId === userId;
  }

  /**
   * Check if user is DJ
   */
  isDJ(session: Session, userId: string): boolean {
    return session.djs.includes(userId);
  }

  /**
   * Check if user is in session
   */
  isParticipant(session: Session, userId: string): boolean {
    return session.participants.some((p) => p.userId === userId);
  }
}
