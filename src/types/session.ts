/**
 * Session types
 */

import { Participant, TasteProfile } from './user';
import { QueueItem } from './queue';
import { VoteState } from './vote';
import { PlaybackMode } from './spotify';

export interface SessionSettings {
  voteToSkip: boolean;
  skipThreshold: number;           // Number of votes needed
  playbackMode: PlaybackMode;
}

export interface SessionProfile {
  commonArtists: string[];         // Artist IDs
  commonGenres: string[];
  tasteProfiles: TasteProfile[];
}

export interface Session {
  id: string;
  code: string;                    // Unique join code
  hostId: string;
  participants: Participant[];
  djs: string[];                   // User IDs with DJ privileges
  settings: SessionSettings;
  queue: QueueItem[];
  playedTracks: string[];          // Track IDs that have already been played
  votes: VoteState;
  profile?: SessionProfile;        // Aggregated taste profile
  createdAt: number;               // Timestamp
  updatedAt: number;               // Timestamp
  lastParticipantChange: number;   // Timestamp for debouncing regen
  activeDeviceId?: string;         // For device playback mode
  activeDeviceName?: string;       // Display name of active device
  activeDeviceType?: string;       // Type of active device (Computer, Smartphone, Speaker, etc.)
}

export interface CreateSessionInput {
  hostId: string;
  settings?: Partial<SessionSettings>;
}

export interface JoinSessionInput {
  code: string;
  userId: string;
}

export interface UpdateSessionSettingsInput {
  sessionId: string;
  settings: Partial<SessionSettings>;
}
