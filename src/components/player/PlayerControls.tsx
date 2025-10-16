"use client";

import { useState } from "react";
import type { PlaybackMode } from "@/types";

interface PlayerControlsProps {
  sessionId: string;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  isDJ: boolean;
  deviceName?: string;
  deviceType?: string;
  onPlay?: () => Promise<void>;
  onPause?: () => Promise<void>;
  onSkip?: () => Promise<void>;
}

export function PlayerControls({
  sessionId,
  isPlaying,
  playbackMode,
  isDJ,
  deviceName,
  deviceType,
  onPlay,
  onPause,
  onSkip,
}: PlayerControlsProps) {
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [isSkipLoading, setIsSkipLoading] = useState(false);

  const handlePlayPause = async () => {
    if (!isDJ) return;

    setIsPlayLoading(true);
    try {
      if (isPlaying) {
        await onPause?.();
      } else {
        await onPlay?.();
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
    } finally {
      setIsPlayLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!isDJ) return;

    setIsSkipLoading(true);
    try {
      await onSkip?.();
    } catch (error) {
      console.error("Error skipping track:", error);
    } finally {
      setIsSkipLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Playback Mode Indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Playback Controls
        </span>
        <div className="flex items-center gap-2">
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              playbackMode === "web"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            }`}
          >
            {playbackMode === "web" ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <span>Web Player</span>
              </>
            ) : deviceName ? (
              <>
                {deviceType === "Computer" && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                  </svg>
                )}
                {deviceType === "Smartphone" && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                )}
                {deviceType === "Speaker" && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                )}
                {!deviceType || (deviceType !== "Computer" && deviceType !== "Smartphone" && deviceType !== "Speaker") && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                )}
                <span>{deviceName}</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <span>Device</span>
              </>
            )}
          </div>
          {!isDJ && (
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              View Only
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={!isDJ || isPlayLoading}
          className={`
            relative w-14 h-14 rounded-full flex items-center justify-center transition-all
            ${
              isDJ
                ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white shadow-lg hover:shadow-xl active:scale-95"
                : "bg-gray-300 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }
            ${isPlayLoading ? "opacity-50 cursor-wait" : ""}
          `}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlayLoading ? (
            <svg
              className="animate-spin h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          disabled={!isDJ || isSkipLoading}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all
            ${
              isDJ
                ? "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 active:scale-95"
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            }
            ${isSkipLoading ? "opacity-50 cursor-wait" : ""}
          `}
          aria-label="Skip to next track"
        >
          {isSkipLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
            </svg>
          )}
        </button>
      </div>

      {/* Help Text */}
      {!isDJ && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Only DJs can control playback
        </p>
      )}
    </div>
  );
}
