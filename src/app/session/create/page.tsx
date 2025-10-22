"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/logrocket";
import { LOGROCKET_EVENTS } from "@/lib/logrocket-events";

export default function CreateSessionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomCode, setShowCustomCode] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [settings, setSettings] = useState({
    voteToSkip: true,
    skipThreshold: 2,
  });

  const handleCreateSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/session/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customCode: showCustomCode && customCode ? customCode : undefined,
          settings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      // Track session creation
      trackEvent(LOGROCKET_EVENTS.SESSION_CREATED, {
        sessionId: data.session.id,
        customCode: showCustomCode && customCode ? true : false,
        voteToSkip: settings.voteToSkip,
        skipThreshold: settings.skipThreshold,
      });

      // Redirect to session page
      router.push(`/session/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="card">
          <h1 className="text-3xl font-bold text-center mb-2">Create Session</h1>
          <p className="text-gray-400 text-center mb-8">
            Set up your collaborative music session
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-4 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Custom Code Section */}
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Custom Join Code</label>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  Premium
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Create a memorable code (4-12 characters, letters/numbers/hyphens)
              </p>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={showCustomCode}
                  onChange={(e) => setShowCustomCode(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700"
                />
                <span className="text-sm">Use custom code</span>
              </label>
              {showCustomCode && (
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="MY-PARTY-2024"
                  maxLength={12}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Session Settings</h3>

              {/* Vote to Skip */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Vote to Skip</label>
                  <p className="text-xs text-gray-400">
                    Allow participants to vote to skip tracks
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.voteToSkip}
                    onChange={(e) =>
                      setSettings({ ...settings, voteToSkip: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* Skip Threshold */}
              {settings.voteToSkip && (
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Skip Threshold: {settings.skipThreshold} votes
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Number of votes needed to skip a track
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.skipThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        skipThreshold: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateSession}
              disabled={isLoading || (showCustomCode && !customCode)}
              className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Session"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
