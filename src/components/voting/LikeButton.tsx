"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

interface LikeButtonProps {
  sessionId: string;
  currentTrackId: string | null;
  currentLikeCount: number;
  hasUserLiked: boolean;
  onLikeSuccess?: () => void;
}

export function LikeButton({
  sessionId,
  currentTrackId,
  currentLikeCount,
  hasUserLiked,
  onLikeSuccess,
}: LikeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = async () => {
    if (!currentTrackId || isLoading) {
      return;
    }

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    setIsLoading(true);
    try {
      const response = await fetch("/api/vote/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          trackId: currentTrackId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to like track");
      }

      onLikeSuccess?.();
    } catch (error) {
      console.error("Error liking track:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !currentTrackId || isLoading;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleLike}
        disabled={isDisabled}
        className={`
          relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all
          ${
            currentTrackId
              ? "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 active:scale-95"
              : "bg-gray-200 dark:bg-gray-800 cursor-not-allowed"
          }
          ${isLoading ? "opacity-50 cursor-wait" : ""}
          ${isAnimating ? "scale-110" : "scale-100"}
        `}
        aria-label={hasUserLiked ? "Unlike track" : "Like track"}
        title={
          !currentTrackId
            ? "No track playing"
            : hasUserLiked
            ? "Unlike this track"
            : "Like this track"
        }
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5 text-gray-700 dark:text-gray-200"
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
          <Heart
            className={`
              w-5 h-5 transition-all
              ${
                hasUserLiked
                  ? "fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400"
                  : "text-gray-700 dark:text-gray-200"
              }
            `}
          />
        )}
        <span
          className={`
            text-sm font-medium
            ${
              hasUserLiked
                ? "text-red-500 dark:text-red-400"
                : "text-gray-700 dark:text-gray-200"
            }
          `}
        >
          {hasUserLiked ? "Liked" : "Like"}
        </span>
      </button>

      {/* Like Count */}
      {currentLikeCount > 0 && (
        <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
          <Heart className="w-3 h-3 mr-1 fill-red-500 text-red-500" />
          <span>
            {currentLikeCount} {currentLikeCount === 1 ? "like" : "likes"}
          </span>
        </div>
      )}
    </div>
  );
}
