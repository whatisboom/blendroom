"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

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
  queue: unknown[];
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          {/* Player (Placeholder) */}
          <div className="card lg:col-span-2">
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
        </div>

        {/* Queue (Placeholder) */}
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Queue</h2>
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            {session.queue.length === 0 ? (
              <p>No tracks in queue yet</p>
            ) : (
              <p>{session.queue.length} tracks in queue</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
