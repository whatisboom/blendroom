"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ProgressBar({ progressMs, durationMs, isPlaying }: ProgressBarProps) {
  const [currentProgress, setCurrentProgress] = useState(progressMs);

  // Update current progress when prop changes
  useEffect(() => {
    setCurrentProgress(progressMs);
  }, [progressMs]);

  // Auto-increment progress when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentProgress((prev) => {
        const next = prev + 1000;
        return next > durationMs ? durationMs : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, durationMs]);

  const progressPercent = durationMs > 0 ? (currentProgress / durationMs) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {/* Current Time */}
        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px] text-right">
          {formatTime(currentProgress)}
        </span>

        {/* Progress Bar */}
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden group cursor-pointer">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 transition-all duration-100 ease-linear group-hover:from-green-600 group-hover:to-green-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Duration */}
        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">
          {formatTime(durationMs)}
        </span>
      </div>
    </div>
  );
}
