"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { NowPlaying, ProgressBar, PlayerControls, DeviceSelector } from "@/components/player";
import { AddTrackModal } from "@/components/queue/AddTrackModal";
import { SortableQueueList } from "@/components/queue/SortableQueueList";
import { SessionSettingsModal } from "@/components/session/SessionSettingsModal";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/components/ui";
import { WS_EVENTS } from "@/lib/websocket/events";
import type { SpotifyTrack } from "@/types";

interface QueueItem {
  track: {
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
  };
  position: number;
  addedBy: string;
  addedAt: number;
  isStable: boolean;
}

interface Session {
  id: string;
  code: string;
  hostId: string;
  participants: Array<{
    userId: string;
    name: string;
    isHost: boolean;
    isDJ: boolean;
  }>;
  djs: string[];
  settings: {
    voteToSkip: boolean;
    skipThreshold: number;
  };
  queue: QueueItem[];
  activeDeviceId?: string;
  activeDeviceName?: string;
  activeDeviceType?: string;
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: userSession } = useSession();
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddTrackModalOpen, setIsAddTrackModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);

  // Use ref to track previous track ID to avoid infinite loops
  const previousTrackIdRef = useRef<string | null>(null);

  // Initialize WebSocket connection
  const { socket, isConnected, isJoined } = useSocket({
    sessionId: resolvedParams.id,
    autoConnect: true,
  });

  useEffect(() => {
    fetchSession();
  }, [resolvedParams.id]);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket || !isJoined) return;

    console.log("[SessionPage] Setting up WebSocket event listeners");

    // Listen for participant events
    socket.on(WS_EVENTS.PARTICIPANT_JOINED, (participant) => {
      console.log("[SessionPage] Participant joined:", participant);
      toast.info(`${participant.name} joined the session`);
      fetchSession();
    });

    socket.on(WS_EVENTS.PARTICIPANT_LEFT, (userId) => {
      console.log("[SessionPage] Participant left:", userId);
      // Don't show toast for current user leaving (they'll see the redirect)
      if (userId !== userSession?.user?.id) {
        const leftParticipant = session?.participants.find(p => p.userId === userId);
        if (leftParticipant) {
          toast.info(`${leftParticipant.name} left the session`);
        }
      }
      fetchSession();
    });

    // Listen for queue updates
    socket.on(WS_EVENTS.QUEUE_UPDATED, (queue) => {
      console.log("[SessionPage] Queue updated:", queue.length, "tracks");
      setSession((prev) => prev ? { ...prev, queue } : null);
    });

    // Listen for playback state changes
    socket.on(WS_EVENTS.PLAYBACK_STATE_CHANGED, (state) => {
      console.log("[SessionPage] Playback state changed:", state);
      if (state.item) {
        setCurrentTrack(state.item);
        setIsPlaying(state.is_playing);
        setProgressMs(state.progress_ms);
        previousTrackIdRef.current = state.item.id;
      }
    });

    // Listen for vote updates
    socket.on(WS_EVENTS.VOTE_UPDATED, (data) => {
      console.log("[SessionPage] Vote updated:", data);
    });

    // Listen for track skipped
    socket.on(WS_EVENTS.TRACK_SKIPPED, (data) => {
      console.log("[SessionPage] Track skipped:", data);
      toast.success(
        "Track skipped",
        `Vote threshold reached (${data.voteCount} votes)`
      );
      setProgressMs(0);
      fetchSession();
    });

    // Listen for DJ assignment
    socket.on(WS_EVENTS.DJ_ASSIGNED, (userId) => {
      console.log("[SessionPage] DJ assigned:", userId);
      const participant = session?.participants.find(p => p.userId === userId);
      if (participant) {
        toast.success(`${participant.name} is now a DJ`);
      }
      fetchSession();
    });

    socket.on(WS_EVENTS.DJ_REMOVED, (userId) => {
      console.log("[SessionPage] DJ removed:", userId);
      const participant = session?.participants.find(p => p.userId === userId);
      if (participant) {
        toast.info(`${participant.name} is no longer a DJ`);
      }
      fetchSession();
    });

    // Listen for settings updates
    socket.on(WS_EVENTS.SESSION_SETTINGS_UPDATED, (settings) => {
      console.log("[SessionPage] Settings updated:", settings);
      toast.success("Session settings updated");
      fetchSession();
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off(WS_EVENTS.PARTICIPANT_JOINED);
      socket.off(WS_EVENTS.PARTICIPANT_LEFT);
      socket.off(WS_EVENTS.QUEUE_UPDATED);
      socket.off(WS_EVENTS.PLAYBACK_STATE_CHANGED);
      socket.off(WS_EVENTS.VOTE_UPDATED);
      socket.off(WS_EVENTS.TRACK_SKIPPED);
      socket.off(WS_EVENTS.DJ_ASSIGNED);
      socket.off(WS_EVENTS.DJ_REMOVED);
      socket.off(WS_EVENTS.SESSION_SETTINGS_UPDATED);
    };
  }, [socket, isJoined, session, toast]);

  // Poll playback state for progress updates (lightweight polling for progress bar)
  useEffect(() => {
    if (!session || !isPlaying) return;

    // Only poll if session has an active device (playback has been initialized)
    const hasActiveDevice = !!session.activeDeviceId;
    if (!hasActiveDevice) return;

    const fetchPlaybackState = async () => {
      try {
        const response = await fetch("/api/playback/state");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.state) {
          const newTrack = data.state.item;
          const newTrackId = newTrack?.id || null;

          // Check if track changed (natural progression to next song)
          if (newTrackId && previousTrackIdRef.current && newTrackId !== previousTrackIdRef.current) {
            // Track changed - notify backend and refresh session
            try {
              await fetch("/api/playback/track-change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId: session.id,
                  trackId: newTrackId,
                }),
              });
              await fetchSession();
            } catch (error) {
              console.error("Failed to handle track change:", error);
            }
          }

          // Update ref with new track ID
          previousTrackIdRef.current = newTrackId;

          setCurrentTrack(newTrack || null);
          setIsPlaying(data.state.is_playing || false);
          setProgressMs(data.state.progress_ms || 0);
        }
      } catch (err) {
        console.error("Failed to fetch playback state:", err);
      }
    };

    // Poll every 10 seconds (reduced from 20) just for progress bar updates
    const interval = setInterval(fetchPlaybackState, 10000);

    return () => clearInterval(interval);
  }, [session, isPlaying]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/session/${resolvedParams.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Session not found");
        }
        if (response.status === 403) {
          throw new Error("You are not a participant of this session");
        }
        throw new Error("Failed to load session");
      }

      const data = await response.json();
      setSession(data.session);

      // Check if device is already connected
      if (data.session.activeDeviceId) {
        setIsDeviceConnected(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.code);
      toast.success("Session code copied to clipboard");
    }
  };

  const handleLeaveSession = async () => {
    if (!session || !userSession?.user?.id) return;

    // Check if user is the host
    const isHost = session.participants.find(
      (p) => p.userId === userSession.user.id
    )?.isHost;

    // Show confirmation for host
    if (isHost) {
      const confirmed = window.confirm(
        "You are the host. Leaving will stop playback for all participants. Are you sure you want to leave?"
      );

      if (!confirmed) return;

      // Stop playback before leaving
      try {
        await fetch("/api/playback/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.id }),
        });
      } catch (err) {
        console.error("Failed to stop playback:", err);
        // Continue with leaving even if pause fails
      }
    }

    try {
      const response = await fetch("/api/session/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (response.ok) {
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to leave session:", err);
    }
  };

  // Playback control handlers
  const handlePlay = async () => {
    if (!session) return;

    try {
      const response = await fetch("/api/playback/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to play");
      }

      setIsPlaying(true);
      // Refresh session to update queue
      await fetchSession();
    } catch (err) {
      console.error("Failed to play:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to play";
      toast.error("Playback error", errorMessage);
    }
  };

  const handlePause = async () => {
    if (!session) return;

    try {
      const response = await fetch("/api/playback/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to pause");
      }

      setIsPlaying(false);
    } catch (err) {
      console.error("Failed to pause:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to pause";
      toast.error("Playback error", errorMessage);
    }
  };

  const handleSkip = async () => {
    if (!session) return;

    try {
      const response = await fetch("/api/playback/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to skip");
      }

      // Reset progress and refresh session to update queue
      setProgressMs(0);
      await fetchSession();
    } catch (err) {
      console.error("Failed to skip:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to skip";
      toast.error("Playback error", errorMessage);
    }
  };

  const handlePlayFromQueue = async (position: number) => {
    if (!session || !isUserDJ) return;

    try {
      const response = await fetch("/api/playback/play-from-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          position,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to play from queue");
      }

      // Reset progress and refresh session to update queue
      setProgressMs(0);
      setIsPlaying(true);
      await fetchSession();
    } catch (err) {
      console.error("Failed to play from queue:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to play from queue";
      toast.error("Playback error", errorMessage);
    }
  };

  const handleDeviceConnected = (deviceId: string) => {
    setIsDeviceConnected(true);
    console.log("Device connected:", deviceId);
  };

  const handleToggleDJ = async (userId: string, currentlyDJ: boolean) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/session/${session.id}/djs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: currentlyDJ ? "remove" : "add",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update DJ status");
      }

      // Session will be updated via WebSocket
    } catch (err) {
      console.error("Failed to update DJ status:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update DJ status";
      toast.error("Error updating DJ", errorMessage);
    }
  };

  const handleTrackAdded = () => {
    // Show success toast
    toast.success("Track added to queue");
    // Refresh session (queue will also update via WebSocket)
    fetchSession();
  };

  const handleSettingsUpdated = () => {
    // Refresh session (settings will also update via WebSocket)
    fetchSession();
  };

  const handleQueueReordered = () => {
    // Show success toast
    toast.success("Queue reordered");
    // Session will update via WebSocket
  };

  // Check if current user is a DJ
  const isUserDJ = Boolean(
    userSession?.user?.id &&
      session?.participants.find((p) => p.userId === userSession.user.id)?.isDJ
  );

  // Check if current user is the host
  const isUserHost = userSession?.user?.id === session?.hostId;

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading session...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-md w-full text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={() => router.push("/")} className="btn-secondary">
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Session Active</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Code:</span>
                  <code className="text-2xl font-mono font-bold text-green-400">
                    {session.code}
                  </code>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isUserHost && (
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Settings
                </button>
              )}
              <button onClick={handleLeaveSession} className="btn-secondary">
                Leave Session
              </button>
            </div>
          </div>
        </div>

        {/* Player */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Now Playing</h2>
          <div className="space-y-4">
            {/* Device Selection (DJs only, until device is connected) */}
            {isUserDJ && !isDeviceConnected ? (
              <DeviceSelector
                sessionId={session.id}
                onDeviceConnected={handleDeviceConnected}
              />
            ) : (
              <>
                {/* Now Playing Display */}
                <NowPlaying track={currentTrack} isPlaying={isPlaying} />

                {/* Progress Bar */}
                {currentTrack && (
                  <ProgressBar
                    progressMs={progressMs}
                    durationMs={currentTrack.duration_ms}
                    isPlaying={isPlaying}
                  />
                )}

                {/* Player Controls */}
                <PlayerControls
                  sessionId={session.id}
                  isPlaying={isPlaying}
                  isDJ={isUserDJ}
                  deviceName={session.activeDeviceName}
                  deviceType={session.activeDeviceType}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSkip={handleSkip}
                />
              </>
            )}
          </div>
        </div>

        {/* Queue and Participants */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Queue</h2>
              {isUserDJ && (
                <button
                  onClick={() => setIsAddTrackModalOpen(true)}
                  className="text-sm px-4 py-2 bg-spotify-green hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  Add Track
                </button>
              )}
            </div>

            {session.queue.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                <p>No tracks in queue yet</p>
              </div>
            ) : (
              <SortableQueueList
                queue={session.queue}
                sessionId={session.id}
                isDJ={isUserDJ}
                onPlayFromQueue={handlePlayFromQueue}
                onReorderComplete={handleQueueReordered}
              />
            )}
          </div>

          {/* Participants */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">
              Participants ({session.participants.length})
            </h2>
            <div className="space-y-3">
              {session.participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{participant.name}</div>
                    <div className="text-xs text-gray-400">
                      {participant.isHost && "Host • "}
                      {participant.isDJ && "DJ"}
                    </div>
                  </div>

                  {/* DJ Management Button (Host Only) */}
                  {isUserHost && !participant.isHost && (
                    <button
                      onClick={() => handleToggleDJ(participant.userId, participant.isDJ)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        participant.isDJ
                          ? "bg-red-900/50 text-red-300 hover:bg-red-900"
                          : "bg-green-900/50 text-green-300 hover:bg-green-900"
                      }`}
                    >
                      {participant.isDJ ? "Remove DJ" : "Make DJ"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Track Modal */}
      {session && (
        <AddTrackModal
          isOpen={isAddTrackModalOpen}
          onClose={() => setIsAddTrackModalOpen(false)}
          sessionId={session.id}
          onTrackAdded={handleTrackAdded}
        />
      )}

      {/* Session Settings Modal */}
      {session && (
        <SessionSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          sessionId={session.id}
          currentSettings={session.settings}
          onSettingsUpdated={handleSettingsUpdated}
        />
      )}
    </main>
  );
}
