"use client";

import type { SpotifyTrack } from "@/types";
import Image from "next/image";
import { QRCodeDisplay } from "@/components/session";

interface NowPlayingProps {
  track: SpotifyTrack | null;
  isPlaying?: boolean;
  sessionCode?: string;
}

export function NowPlaying({ track, isPlaying = false, sessionCode }: NowPlayingProps) {
  if (!track) {
    return (
      <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-24 h-24 bg-gray-300 dark:bg-gray-700 rounded-md flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">No track playing</p>
        </div>
      </div>
    );
  }

  const albumArt = track.album.images[0]?.url;
  const artists = track.artists.map((artist) => artist.name).join(", ");

  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Album Artwork */}
      <div className="relative w-24 h-24 flex-shrink-0">
        {albumArt ? (
          <Image
            src={albumArt}
            alt={`${track.name} album art`}
            fill
            className="object-cover rounded-md"
            sizes="96px"
            priority
          />
        ) : (
          <div className="w-24 h-24 bg-gray-300 dark:bg-gray-700 rounded-md flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5z" />
            </svg>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {track.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
          {artists}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          {track.album.name}
        </p>
      </div>

      {/* QR Code */}
      {sessionCode && (
        <div className="flex-shrink-0">
          <QRCodeDisplay sessionCode={sessionCode} size={96} />
        </div>
      )}

      {/* Spotify Link */}
      <a
        href={track.external_urls.spotify}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
        aria-label="Open in Spotify"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      </a>
    </div>
  );
}
