/**
 * WebSocket event types
 */

import { Participant } from './user';
import { QueueItem } from './queue';
import { PlaybackState } from './spotify';
import { SessionSettings } from './session';

export interface ServerToClientEvents {
  participant_joined: (participant: Participant) => void;
  participant_left: (userId: string) => void;
  queue_updated: (queue: QueueItem[]) => void;
  playback_state_changed: (state: PlaybackState) => void;
  track_skipped: (data: { voteCount: number }) => void;
  vote_updated: (data: { type: 'skip' | 'like'; count: number; threshold?: number }) => void;
  dj_assigned: (userId: string) => void;
  dj_removed: (userId: string) => void;
  session_settings_updated: (settings: SessionSettings) => void;
  session_ended: () => void;
  error: (error: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  join_session: (sessionId: string, callback: (success: boolean) => void) => void;
  leave_session: (sessionId: string) => void;
}

export interface SocketData {
  userId: string;
  sessionId: string;
}
