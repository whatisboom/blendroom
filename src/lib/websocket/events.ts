/**
 * WebSocket event name constants
 * Single source of truth for all WebSocket event names
 */

// Server to Client Events
export const WS_EVENTS = {
  // Participant events
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',

  // Queue events
  QUEUE_UPDATED: 'queue_updated',

  // Playback events
  PLAYBACK_STATE_CHANGED: 'playback_state_changed',
  TRACK_SKIPPED: 'track_skipped',

  // Vote events
  VOTE_UPDATED: 'vote_updated',

  // DJ events
  DJ_ASSIGNED: 'dj_assigned',
  DJ_REMOVED: 'dj_removed',

  // Session events
  SESSION_SETTINGS_UPDATED: 'session_settings_updated',
  SESSION_ENDED: 'session_ended',

  // Error events
  ERROR: 'error',

  // Client to Server Events
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
} as const;

// Type for event names
export type WSEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS];
