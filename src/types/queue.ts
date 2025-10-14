/**
 * Queue and track management types
 */

import { Track } from './spotify';

export interface QueueItem {
  track: Track;
  position: number;
  addedBy: string | 'algorithm';  // userId or 'algorithm'
  addedAt: number;                 // Timestamp
  isStable: boolean;               // True for next 3 tracks
}

export interface QueueState {
  items: QueueItem[];
  currentTrack: Track | null;
  currentPosition: number;
  lastGenerated: number;           // Timestamp
  generationLocked: boolean;       // Prevent concurrent regeneration
}
