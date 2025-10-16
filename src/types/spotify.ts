/**
 * Spotify API types for tracks, artists, and audio features
 */

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  external_urls: {
    spotify: string;
  };
  preview_url: string | null;
}

export interface AudioFeatures {
  id: string;
  danceability: number;       // 0-1
  energy: number;              // 0-1
  valence: number;             // 0-1 (happiness/positivity)
  tempo: number;               // BPM
  acousticness: number;        // 0-1
  instrumentalness: number;    // 0-1
  speechiness: number;         // 0-1
  loudness: number;            // dB
  key: number;                 // 0-11 (pitch class)
  mode: number;                // 0 or 1 (minor or major)
  time_signature: number;      // 3-7
}

export interface Track extends SpotifyTrack {
  audioFeatures?: AudioFeatures;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images: SpotifyImage[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  volume_percent: number;
}

export interface PlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device: SpotifyDevice;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
}
