"use client";

import { useState } from "react";
import { SkipForward } from "lucide-react";

interface SkipVoteButtonProps {
  sessionId: string;
  currentTrackId: string | null;
  voteToSkipEnabled: boolean;
  skipThreshold: number;
  currentVoteCount: number;
  hasUserVoted: boolean;
  onVoteSuccess?: () => void;
}

export function SkipVoteButton({
  sessionId,
  currentTrackId,
  voteToSkipEnabled,
  skipThreshold,
  currentVoteCount,
  hasUserVoted,
  onVoteSuccess,
}: SkipVoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async () => {
    if (!currentTrackId || !voteToSkipEnabled || hasUserVoted || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/vote/skip", {
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
        throw new Error(data.error || "Failed to vote");
      }

      onVoteSuccess?.();
    } catch (error) {
      console.error("Error voting to skip:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !voteToSkipEnabled || !currentTrackId || hasUserVoted || isLoading;
  const progress = skipThreshold > 0 ? (currentVoteCount / skipThreshold) * 100 : 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleVote}
        disabled={isDisabled}
        className={`
          relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all
          ${
            hasUserVoted
              ? "bg-green-500 dark:bg-green-600 text-white"
              : voteToSkipEnabled && currentTrackId
              ? "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 active:scale-95"
              : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
          }
          ${isLoading ? "opacity-50 cursor-wait" : ""}
        `}
        aria-label="Vote to skip track"
        title={
          !voteToSkipEnabled
            ? "Vote to skip is disabled"
            : !currentTrackId
            ? "No track playing"
            : hasUserVoted
            ? "You've already voted to skip"
            : `Vote to skip (${currentVoteCount}/${skipThreshold})`
        }
      >
        {isLoading ? (
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
          <SkipForward className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">
          {hasUserVoted ? "Voted" : "Skip"}
        </span>
      </button>

      {/* Vote Progress */}
      {voteToSkipEnabled && currentTrackId && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {currentVoteCount} / {skipThreshold} votes
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 dark:bg-green-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
