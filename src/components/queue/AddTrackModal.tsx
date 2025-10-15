"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Search, Music, Plus, Loader2 } from "lucide-react";
import type { SpotifyTrack } from "@/types";

export interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onTrackAdded: () => void;
}

/**
 * Modal for searching and adding tracks to the queue
 * DJ-only feature
 */
export function AddTrackModal({
  isOpen,
  onClose,
  sessionId,
  onTrackAdded,
}: AddTrackModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchTracks(query);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [query]);

  const searchTracks = async (searchQuery: string) => {
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search/tracks?q=${encodeURIComponent(searchQuery)}&limit=10`
      );

      if (!response.ok) {
        throw new Error("Failed to search tracks");
      }

      const data = await response.json();
      setResults(data.tracks || []);
    } catch (err) {
      console.error("Error searching tracks:", err);
      setError("Failed to search tracks. Please try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (trackId: string) => {
    setIsAdding(trackId);
    setError(null);

    try {
      const response = await fetch(`/api/queue/${sessionId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add track");
      }

      // Track added successfully
      onTrackAdded();
      setQuery("");
      setResults([]);
      onClose();
    } catch (err) {
      console.error("Error adding track:", err);
      setError(err instanceof Error ? err.message : "Failed to add track");
    } finally {
      setIsAdding(null);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Track to Queue" size="lg">
      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search for a track..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-spotify-green"
            autoFocus
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-600 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-2">
        {isSearching && query.length >= 2 && (
          <div className="flex items-center justify-center p-8 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Searching...</span>
          </div>
        )}

        {!isSearching && query.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-gray-400">
            <Music className="w-12 h-12 mb-2" />
            <p>No tracks found</p>
            <p className="text-sm text-gray-500">Try a different search term</p>
          </div>
        )}

        {!isSearching && query.length < 2 && (
          <div className="flex flex-col items-center justify-center p-8 text-gray-400">
            <Search className="w-12 h-12 mb-2" />
            <p>Start typing to search for tracks</p>
          </div>
        )}

        {results.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
          >
            {/* Album Art */}
            {track.album.images[0] && (
              <img
                src={track.album.images[0].url}
                alt={track.album.name}
                className="w-12 h-12 rounded"
              />
            )}

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{track.name}</div>
              <div className="text-sm text-gray-400 truncate">
                {track.artists.map((a) => a.name).join(", ")}
              </div>
            </div>

            {/* Duration */}
            <div className="text-sm text-gray-400">
              {formatDuration(track.duration_ms)}
            </div>

            {/* Add Button */}
            <button
              onClick={() => handleAddTrack(track.id)}
              disabled={isAdding === track.id}
              className="flex items-center gap-1 px-3 py-2 bg-spotify-green hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding === track.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
