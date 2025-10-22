"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/logrocket";
import { LOGROCKET_EVENTS } from "@/lib/logrocket-events";

export default function JoinSessionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/session/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join session");
      }

      // Track session joined
      trackEvent(LOGROCKET_EVENTS.SESSION_JOINED, {
        sessionId: data.session.id,
        sessionCode: code.toUpperCase(),
      });

      // Redirect to session page
      router.push(`/session/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join session");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="card">
          <h1 className="text-3xl font-bold text-center mb-2">Join Session</h1>
          <p className="text-gray-400 text-center mb-8">
            Enter the session code to join
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-4 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleJoinSession} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Session Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={12}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 uppercase tracking-wider"
              />
              <p className="text-xs text-gray-400 mt-2 text-center">
                Ask the host for the session code
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !code}
              className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Joining..." : "Join Session"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
