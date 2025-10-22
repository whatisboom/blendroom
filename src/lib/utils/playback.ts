import type { Session, PlaybackState } from "@/types";
import type { SessionStore } from "@/lib/session/store.interface";
import { SpotifyService } from "@/lib/services/spotify.service";
import { checkAndRepopulateQueue } from "@/lib/queue-auto-repopulate";
import { broadcastToSession } from "@/lib/websocket/server";
import { normalizeQueue } from "./queue";

/**
 * Handle track completion (natural progression, manual skip, or vote-to-skip)
 * - Removes current track from queue
 * - Normalizes queue positions and stable flags
 * - Triggers auto-repopulation if needed
 * - Broadcasts WebSocket events to all participants
 */
export async function handleTrackCompletion(
  sessionId: string,
  session: Session,
  store: SessionStore,
  accessToken: string
): Promise<void> {
  // Remove first track from queue and add to played tracks
  if (session.queue.length > 0) {
    const completedTrack = session.queue.shift();
    if (completedTrack) {
      session.playedTracks.push(completedTrack.track.id);
    }

    // Normalize queue positions and stable flags
    session.queue = normalizeQueue(session.queue);
  }

  // Save updated session
  session.updatedAt = Date.now();
  await store.set(sessionId, session);

  // Check if queue needs repopulation
  await checkAndRepopulateQueue(session, store, accessToken);

  // Get updated session (may have new tracks from auto-repopulate)
  const updatedSession = await store.get(sessionId);

  // Get current playback state from Spotify
  const spotifyService = new SpotifyService(accessToken);
  const playbackState: PlaybackState = await spotifyService.getPlaybackState();

  // Broadcast playback state change to all participants
  broadcastToSession(sessionId, "playback_state_changed", playbackState);

  // Broadcast queue update to all participants
  if (updatedSession) {
    broadcastToSession(sessionId, "queue_updated", updatedSession.queue);
  }
}
