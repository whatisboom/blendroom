/**
 * User and participant types
 */

import { AudioFeatures, SpotifyArtist } from './spotify';

export interface User {
  id: string;
  spotifyId: string;
  name: string;
  email?: string;
  image?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
}

export interface TasteProfile {
  userId: string;
  topTracks: string[];           // Track IDs
  topArtists: SpotifyArtist[];
  topGenres: string[];
  avgAudioFeatures: AudioFeatures;
  lastUpdated: number;           // Timestamp
}

export interface Participant {
  userId: string;
  name: string;
  image?: string;
  joinedAt: number;              // Timestamp
  isHost: boolean;
  isDJ: boolean;
  tasteProfile?: TasteProfile;
}
