/**
 * LogRocket custom event names
 * Centralized constants to ensure consistency across the app
 */

export const LOGROCKET_EVENTS = {
  // Session events
  SESSION_CREATED: 'session_created',
  SESSION_JOINED: 'session_joined',
  SESSION_LEFT: 'session_left',

  // Playback events
  PLAYBACK_STARTED: 'playback_started',
  PLAYBACK_PAUSED: 'playback_paused',
  TRACK_SKIPPED: 'track_skipped',
  PLAY_FROM_QUEUE: 'play_from_queue',

  // Queue events
  TRACK_ADDED: 'track_added',
  QUEUE_REORDERED: 'queue_reordered',
  QUEUE_GENERATED: 'queue_generated',

  // Voting events
  VOTE_LIKE: 'vote_like',
  VOTE_SKIP: 'vote_skip',

  // DJ events
  DJ_ASSIGNED: 'dj_assigned',
  DJ_REMOVED: 'dj_removed',

  // Settings events
  SETTINGS_UPDATED: 'settings_updated',

  // Device events
  DEVICE_CONNECTED: 'device_connected',
} as const;

export type LogRocketEvent = typeof LOGROCKET_EVENTS[keyof typeof LOGROCKET_EVENTS];
