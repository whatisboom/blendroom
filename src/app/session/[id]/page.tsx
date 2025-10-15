"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
    playbackMode: string;
  };
  queue: QueueItem[];
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: userSession } = useSession();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingQueue, setIsGeneratingQueue] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [resolvedParams.id]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveSession = async () => {
    if (!session) return;

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

  const handleGenerateQueue = async () => {
    if (!session) return;

    setIsGeneratingQueue(true);
    try {
      const response = await fetch(`/api/queue/${session.id}/generate`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate queue");
      }

      const data = await response.json();

      // Refresh session to get updated queue
      await fetchSession();

      console.log(`Generated ${data.generated} new tracks`);
    } catch (err) {
      console.error("Failed to generate queue:", err);
      setError(err instanceof Error ? err.message : "Failed to generate queue");
    } finally {
      setIsGeneratingQueue(false);
    }
  };

  // Check if current user is a DJ
  const isUserDJ = userSession?.user?.id && session?.participants.find(
    (p) => p.userId === userSession.user.id
  )?.isDJ;

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
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <button onClick={handleLeaveSession} className="btn-secondary">
              Leave Session
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Now Playing</h2>
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            <p className="mb-4">Player controls coming soon</p>
            <div className="text-sm">
              <div>Playback Mode: {session.settings.playbackMode}</div>
              <div>Vote to Skip: {session.settings.voteToSkip ? "On" : "Off"}</div>
              {session.settings.voteToSkip && (
                <div>Skip Threshold: {session.settings.skipThreshold} votes</div>
              )}
            </div>
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
                  onClick={handleGenerateQueue}
                  disabled={isGeneratingQueue}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingQueue ? "Generating..." : "Generate Queue"}
                </button>
              )}
            </div>

            {session.queue.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                <p className="mb-4">No tracks in queue yet</p>
                {isUserDJ && (
                  <p className="text-sm">
                    Click &quot;Generate Queue&quot; to add tracks based on everyone&apos;s taste
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {session.queue.map((item, index) => (
                  <div
                    key={`${item.track.id}-${item.position}`}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      item.isStable
                        ? "bg-green-900/20 border border-green-700/30"
                        : "bg-gray-800"
                    }`}
                  >
                    {/* Position */}
                    <div className="text-sm text-gray-400 w-6 text-center">
                      {index + 1}
                    </div>

                    {/* Album art */}
                    {item.track.album.images[0] && (
                      <img
                        src={item.track.album.images[0].url}
                        alt={item.track.album.name}
                        className="w-12 h-12 rounded"
                      />
                    )}

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {item.track.name}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {item.track.artists.map((a) => a.name).join(", ")}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-sm text-gray-400">
                      {Math.floor(item.track.duration_ms / 60000)}:
                      {String(
                        Math.floor((item.track.duration_ms % 60000) / 1000)
                      ).padStart(2, "0")}
                    </div>

                    {/* Stable indicator */}
                    {item.isStable && (
                      <div className="text-xs text-green-400 font-medium">
                        Stable
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
