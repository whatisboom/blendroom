"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Save, Loader2 } from "lucide-react";
import type { SessionSettings } from "@/types/session";

export interface SessionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentSettings: SessionSettings;
  onSettingsUpdated: () => void;
}

/**
 * Modal for updating session settings
 * Host-only feature
 */
export function SessionSettingsModal({
  isOpen,
  onClose,
  sessionId,
  currentSettings,
  onSettingsUpdated,
}: SessionSettingsModalProps) {
  const [voteToSkip, setVoteToSkip] = useState(currentSettings.voteToSkip);
  const [skipThreshold, setSkipThreshold] = useState(currentSettings.skipThreshold);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setVoteToSkip(currentSettings.voteToSkip);
      setSkipThreshold(currentSettings.skipThreshold);
      setError(null);
    }
  }, [isOpen, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/session/${sessionId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voteToSkip,
          skipThreshold,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update settings");
      }

      // Settings updated successfully
      onSettingsUpdated();
      onClose();
    } catch (err) {
      console.error("Error updating settings:", err);
      setError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    voteToSkip !== currentSettings.voteToSkip ||
    skipThreshold !== currentSettings.skipThreshold;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session Settings" size="md">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Vote to Skip Toggle */}
        <div>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-medium">Vote to Skip</div>
              <div className="text-sm text-gray-400">
                Allow participants to vote for skipping tracks
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={voteToSkip}
                onChange={(e) => setVoteToSkip(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-spotify-green transition-colors peer-focus:ring-2 peer-focus:ring-spotify-green"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
          </label>
        </div>

        {/* Skip Threshold */}
        {voteToSkip && (
          <div>
            <label className="block">
              <div className="font-medium mb-2">Skip Threshold</div>
              <div className="text-sm text-gray-400 mb-3">
                Number of votes needed to skip a track
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={skipThreshold}
                  onChange={(e) => setSkipThreshold(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-spotify-green"
                />
                <div className="w-12 text-center font-mono text-lg font-bold text-spotify-green">
                  {skipThreshold}
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-spotify-green hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
