import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
          Spotify Collab
        </h1>

        <p className="text-xl text-gray-400">
          Create collaborative music sessions where everyone's taste shapes the playlist
        </p>

        {session ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/session/create"
              className="btn-primary text-lg px-8 py-4"
            >
              Create Session
            </Link>
            <Link
              href="/session/join"
              className="btn-secondary text-lg px-8 py-4"
            >
              Join Session
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/login"
              className="btn-primary text-lg px-8 py-4"
            >
              Sign in with Spotify
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
          <div className="card">
            <h3 className="text-xl font-semibold mb-2 text-green-400">Create or Join</h3>
            <p className="text-gray-400">
              Start a session or join one with a simple code
            </p>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-2 text-green-400">Smart Algorithm</h3>
            <p className="text-gray-400">
              Music blends based on audio features, not random shuffles
            </p>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-2 text-green-400">Vote & Influence</h3>
            <p className="text-gray-400">
              Like tracks to influence future selections, vote to skip
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
