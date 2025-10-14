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

- **Framework**: Next.js 14 with App Router
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

### 2. Set Up Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/api/auth/callback/spotify` to Redirect URIs
4. Copy your Client ID and Client Secret

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Spotify credentials:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SESSION_STORE=memory  # or 'redis'
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
├── lib/
│   ├── services/    # Business logic (Spotify, taste analysis, queue generation)
│   ├── session/     # Session store implementations
│   ├── websocket/   # WebSocket server
│   ├── algorithm/   # Queue generation algorithm
│   └── utils/       # Utility functions
└── types/           # TypeScript type definitions
```

## Development Roadmap

See [implementation.md](./implementation.md) for the complete implementation plan.

### Current Status

- ✅ Project setup and configuration
- ✅ Type definitions
- ✅ Basic layout and styling
- ⏳ Authentication (NextAuth with Spotify)
- ⏳ Session management
- ⏳ Algorithm implementation
- ⏳ WebSocket real-time updates
- ⏳ Frontend components

## License

MIT
