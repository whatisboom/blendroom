# Spotify Collab

A collaborative Spotify session app where multiple users' musical tastes algorithmically influence the playlist in real-time.

## Features

- OAuth authentication with Spotify
- Create and join collaborative music sessions
- Smart algorithm blends music based on audio features
- Real-time updates via WebSockets
- Vote to skip tracks
- Like tracks to influence future selections
- DJ privileges for queue management

## Tech Stack

- **Framework**: Next.js 15.1.6 with App Router
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io
- **State Management**: Zustand
- **Session Storage**: In-memory (default) or Redis

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Spotify Premium account (for playback features)
- Spotify Developer Account

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up HTTPS for Local Development

Spotify requires HTTPS with a custom domain for OAuth in 2025+. Set up a local domain:

1. Add to `/etc/hosts`:
   ```bash
   127.0.0.1 dev.local
   ```

2. Generate self-signed certificates (if not already present):
   ```bash
   mkdir -p certificates
   # Certificates will be auto-generated on first run
   ```

### 3. Set Up Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `https://dev.local:3000/api/auth/callback/spotify` to Redirect URIs
4. Copy your Client ID and Client Secret

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Spotify credentials:

```bash
NEXTAUTH_URL=https://dev.local:3000
NEXTAUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SESSION_STORE=memory  # or 'redis'
```

### 5. Run Development Server

**IMPORTANT**: Always use `npm run dev` (not `npm run dev:certs`) to enable Socket.IO:

```bash
npm run dev
```

This starts the custom server with:
- HTTPS server at `https://dev.local:3000`
- WebSocket server at `wss://dev.local:3000/api/socketio`

Open [https://dev.local:3000](https://dev.local:3000) in your browser (accept the self-signed certificate warning).

## Docker Setup (Optional)

### With Docker Compose (includes Redis)

```bash
docker-compose up --build
```

### Single Container (memory-only)

```bash
docker build -t spotify-collab .
docker run -p 3000:3000 --env-file .env spotify-collab
```

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
├── components/       # React components
├── hooks/            # React hooks (useSocket)
├── lib/
│   ├── services/    # Business logic (Spotify, taste analysis, queue generation)
│   ├── session/     # Session store implementations
│   ├── websocket/   # WebSocket server
│   ├── algorithm/   # Queue generation algorithm
│   └── utils/       # Utility functions
└── types/           # TypeScript type definitions
```

## WebSocket Events

The app uses Socket.IO for real-time synchronization across all session participants:

### Server → Client Events
- `participant_joined` - New participant joined the session
- `participant_left` - Participant left the session
- `queue_updated` - Queue was regenerated or manually updated
- `playback_state_changed` - Playback state changed (play/pause/skip)
- `vote_updated` - Vote count changed (skip or like)
- `track_skipped` - Track was skipped via voting

### Client → Server Events
- `join_session` - Join a session room
- `leave_session` - Leave a session room

All WebSocket events are type-safe using TypeScript interfaces defined in `/src/types/websocket.ts`.

## Development Roadmap

See [implementation.md](./implementation.md) for the complete implementation plan.

### Current Status

#### ✅ Phase 1 MVP Complete
Core features implemented and functional:
- Project setup and configuration
- Type definitions
- Authentication (NextAuth with Spotify OAuth, HTTPS with custom domain)
- Session management (create, join, leave, DJ privileges)
- Taste analysis and queue generation algorithm
- Playback control (Device API with device selection)
- Voting system backend (API routes for skip/like votes)
- WebSocket real-time updates (Socket.IO with Redis pub/sub bridge)
- Frontend UI (landing page, session page, player controls, queue display)
- DJ management UI (assign/remove DJ privileges)
- Track search and manual queue additions
- Drag-and-drop queue reordering with stable track protection
- Toast notifications for all real-time events
- Background queue regeneration with debouncing
- Auto-repopulate queue when low
- Redis session store support

#### ⏳ In Progress
- Voting UI (skip/like buttons) - backend complete, frontend components needed

#### 🚀 Ready for Production
The app is fully functional and ready for deployment and real-world testing with multiple users.

#### 📋 Future Enhancements (Phase 2)
- Web Playback SDK integration (in-browser playback)
- Display who added each manual track in queue
- Session analytics and history
- Advanced algorithm tuning (genre balancing, energy pacing)
- Session customization (mood, explicit filter, era preferences)

## Troubleshooting

### WebSocket Not Working

If real-time updates aren't working:

1. **Check server logs**: You should see `[WebSocket] Socket.IO server initialized`
2. **Verify you're using the correct script**: Use `npm run dev`, NOT `npm run dev:certs`
3. **Check browser console**: Look for WebSocket connection errors
4. **Verify the custom server is running**: Server.js must be used for Socket.IO support

### HTTPS Certificate Warnings

When accessing `https://dev.local:3000`, you'll see a certificate warning. This is expected for self-signed certificates in development. Click "Advanced" and "Proceed to dev.local" to continue.

### Spotify OAuth Errors

If OAuth fails:

1. Verify your Spotify redirect URI is exactly: `https://dev.local:3000/api/auth/callback/spotify`
2. Check that `/etc/hosts` has the entry: `127.0.0.1 dev.local`
3. Ensure your `.env` has `NEXTAUTH_URL=https://dev.local:3000`

### Port Already in Use

If port 3000 is in use:

```bash
# Kill all processes on port 3000
lsof -ti:3000 | xargs kill -9

# Then restart the server
npm run dev
```

## License

MIT
