"use client";

import { useEffect, useState, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/websocket";
import type { SpotifyTrack } from "@/types";
import { WS_EVENTS } from "@/lib/websocket/events";
import { SkipVoteButton } from "./SkipVoteButton";
import { LikeButton } from "./LikeButton";

interface VotingControlsProps {
  sessionId: string;
  currentTrack: SpotifyTrack | null;
  sessionSettings: {
    voteToSkip: boolean;
    skipThreshold: number;
  };
  userId: string;
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
}

export function VotingControls({
  sessionId,
  currentTrack,
  sessionSettings,
  userId: _userId,
  socket,
}: VotingControlsProps) {
  // Vote state
  const [skipVoteCount, setSkipVoteCount] = useState(0);
  const [likeVoteCount, setLikeVoteCount] = useState(0);
  const [userSkipVote, setUserSkipVote] = useState<string | null>(null);
  const [userLikeVotes, setUserLikeVotes] = useState<Set<string>>(new Set());

  // Track previous track ID to detect changes
  const previousTrackIdRef = useRef<string | null>(null);

  // Clear skip votes when track changes
  useEffect(() => {
    if (currentTrack?.id !== previousTrackIdRef.current) {
      console.log("[VotingControls] Track changed, clearing skip votes");
      setUserSkipVote(null);
      setSkipVoteCount(0);
      previousTrackIdRef.current = currentTrack?.id || null;
    }
  }, [currentTrack?.id]);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log("[VotingControls] Setting up WebSocket event listeners");

    // Listen for vote updates
    const handleVoteUpdated = (data: {
      type: "skip" | "like";
      count: number;
      threshold?: number;
    }) => {
      console.log("[VotingControls] Vote updated:", data);
      if (data.type === "skip") {
        setSkipVoteCount(data.count);
      } else if (data.type === "like") {
        setLikeVoteCount(data.count);
      }
    };

    // Listen for track skipped
    const handleTrackSkipped = (data: { voteCount: number }) => {
      console.log("[VotingControls] Track skipped:", data);
      setUserSkipVote(null);
      setSkipVoteCount(0);
    };

    socket.on(WS_EVENTS.VOTE_UPDATED, handleVoteUpdated);
    socket.on(WS_EVENTS.TRACK_SKIPPED, handleTrackSkipped);

    return () => {
      socket.off(WS_EVENTS.VOTE_UPDATED, handleVoteUpdated);
      socket.off(WS_EVENTS.TRACK_SKIPPED, handleTrackSkipped);
    };
  }, [socket]);

  // Handle successful skip vote
  const handleSkipVoteSuccess = () => {
    if (currentTrack?.id) {
      setUserSkipVote(currentTrack.id);
    }
  };

  // Handle successful like vote
  const handleLikeSuccess = () => {
    if (currentTrack?.id) {
      setUserLikeVotes((prev) => {
        const next = new Set(prev);
        if (next.has(currentTrack.id)) {
          next.delete(currentTrack.id);
        } else {
          next.add(currentTrack.id);
        }
        return next;
      });
    }
  };

  const hasUserVotedSkip = currentTrack?.id ? userSkipVote === currentTrack.id : false;
  const hasUserLiked = currentTrack?.id ? userLikeVotes.has(currentTrack.id) : false;

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Voting
        </span>
      </div>

      <div className="flex items-start justify-center gap-4">
        {/* Skip Vote Button */}
        <SkipVoteButton
          sessionId={sessionId}
          currentTrackId={currentTrack?.id || null}
          voteToSkipEnabled={sessionSettings.voteToSkip}
          skipThreshold={sessionSettings.skipThreshold}
          currentVoteCount={skipVoteCount}
          hasUserVoted={hasUserVotedSkip}
          onVoteSuccess={handleSkipVoteSuccess}
        />

        {/* Like Button */}
        <LikeButton
          sessionId={sessionId}
          currentTrackId={currentTrack?.id || null}
          currentLikeCount={likeVoteCount}
          hasUserLiked={hasUserLiked}
          onLikeSuccess={handleLikeSuccess}
        />
      </div>

      {/* Help Text */}
      {!sessionSettings.voteToSkip && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Vote to skip is disabled. Likes still influence the queue.
        </p>
      )}
    </div>
  );
}
