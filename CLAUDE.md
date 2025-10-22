# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev              # Start custom HTTPS server with Socket.IO (REQUIRED for WebSocket)
npm run build            # Production build
npm run lint             # Run ESLint
```

### Testing
```bash
npm test                 # Run all tests (Vitest)
npm run test:unit        # Run unit tests only
npm run test:coverage    # Run tests with coverage report
npm run test:ui          # Open Vitest UI
npm run test:watch       # Run tests in watch mode
```

**Important**: Always use `npm run dev` (NOT `npm run dev:certs`) to run the development server. The custom server in `server.ts` is required for Socket.IO integration.

## Architecture Overview

**Spotify Collab** is a collaborative music session app where multiple users' musical tastes algorithmically influence a shared playlist in real-time.

### Tech Stack
- **Next.js 15.1.6** (App Router) with React 19
- **NextAuth.js v4** with Spotify OAuth
- **Socket.IO** for real-time WebSocket communication
- **Redis** pub/sub for cross-context event broadcasting
- **Zustand** for client state management
- **Vitest** with React Testing Library (258+ tests)

### Core Services (`src/lib/services/`)

**SpotifyService** (`spotify.service.ts`):
- Wrapper around spotify-web-api-node
- Handles rate limiting via spotifyRateLimiter
- Methods: getUserTopTracks, getUserTopArtists, searchTracksByArtist, etc.
- Note: getRecommendations removed (deprecated Spotify API)

**TasteAnalysisService** (`taste-analysis.service.ts`):
- Analyzes user listening preferences
- Generates session profile (common artists, genres)
- Results cached for 1 hour

**QueueGenerationService** (`queue-generation.service.ts`):
- Implements collaborative filtering algorithm
- Scores tracks based on participant match (50%), genre match (30%), liked tracks (20%)
- Applies diversity penalties to prevent artist repetition
- Preserves next 3 tracks during regeneration (stable queue)

**SessionService** (`session.service.ts`):
- CRUD operations for sessions
- Participant and DJ management
- Integrates with SessionStore abstraction

### WebSocket Architecture

**Critical Pattern**: Next.js API routes run in serverless functions and cannot access Socket.IO directly.

**Solution**: Redis pub/sub bridge
1. API routes call `broadcastToSession(sessionId, event, data)` in `lib/websocket/server.ts`
2. Function publishes to Redis channel: `session:{sessionId}:{event}`
3. WebSocket server subscribes to `session:*` pattern
4. WebSocket server broadcasts to Socket.IO rooms

**Event Types** (`lib/websocket/events.ts`):
- Single source of truth for all WebSocket events
- Type-safe interfaces in `types/websocket.ts`

**Server → Client Events**:
- `participant_joined`, `participant_left`
- `queue_updated` (triggers on add/reorder/generate/playback changes)
- `playback_state_changed`, `track_skipped`
- `vote_updated`, `dj_assigned`, `dj_removed`
- `session_settings_updated`, `session_ended`

**Client Hook** (`hooks/useSocket.ts`):
- Auto-connect with reconnection
- Auto-join session room on mount
- Cleanup on unmount

### Queue Generation Algorithm (`lib/algorithm/scoring.ts`)

**Process**:
1. Fetch each user's top 20 tracks/artists (TasteAnalysisService)
2. Calculate session profile (common artists, genres)
3. Get candidate tracks from artist top tracks (fetches ~8 tracks per selected artist)
4. Score each track:
   - **Participant match (50%)**: How many users share this artist/genre
   - **Genre match (30%)**: Overlap with common genres
   - **Liked tracks influence (20%)**: Boost artists from liked tracks
   - **Diversity penalty**: -30% per artist match with recent tracks
5. Deduplicate against queue and playedTracks
6. Merge with stable tracks (first 3 positions unchanged)

**Background Regeneration** (`lib/queue-background-regen.ts`):
- Triggered on participant join/leave
- Debounced 5 seconds to batch changes
- Locked to prevent concurrent regeneration
- 30 second timeout to prevent hanging

**Auto-repopulate** (`lib/queue-auto-repopulate.ts`):
- Triggers when queue < 5 tracks
- Generates tracks to reach MIN_QUEUE_SIZE (10)

### Session Storage Abstraction (`lib/session/`)

**SessionStore Interface** (`store.interface.ts`):
- Pluggable storage backend
- Methods: get, set, delete, has

**Implementations**:
- **MemoryStore** (`memory-store.ts`): Default, in-memory storage
- **RedisStore** (`redis-store.ts`): Redis-backed persistence

**Configuration**: Set `SESSION_STORE=redis` in `.env` to use Redis

### Authentication Flow (`auth.ts`)

- Spotify OAuth via NextAuth.js with JWT strategy
- Required scopes: user-read-email, user-read-private, user-top-read, user-read-playback-state, user-modify-playback-state, streaming
- Automatic token refresh when access token expires
- Protected routes enforced via `middleware.ts` (all routes except `/`, `/login`, `/api/auth/*`)

### Session Data Structure (`types/session.ts`)

```typescript
{
  id: string;              // nanoid
  code: string;            // Unique 6-character join code
  hostId: string;          // Creator's user ID
  participants: Participant[];  // All users in session
  djs: string[];          // User IDs with DJ privileges
  settings: {
    voteToSkip: boolean;
    skipThreshold: number;  // e.g., 0.5 = 50% of participants
  };
  queue: QueueItem[];
  playedTracks: string[];  // Prevents duplicates across session lifetime
  votes: {
    skip: Map<trackId, Set<userId>>;
    like: Map<trackId, Set<userId>>;
  };
  profile: {
    commonArtists: string[];
    commonGenres: string[];
    tasteProfiles: Map<userId, TasteProfile>;
  };
}
```

### API Route Pattern

Standard structure for all API routes:
1. Auth check via `getServerSession(authOptions)`
2. Validate input (Zod schemas)
3. Business logic via services
4. Broadcast WebSocket event if needed
5. Return typed response
6. Wrap in try/catch with `createErrorResponse()`

### Playback Control (`app/api/playback/`)

**Device API Mode**:
- Control user's active Spotify device (computer, phone, speaker)
- Device selection on session init (`/api/playback/init`)
- Host/DJs control playback (`play`, `pause`, `skip`)
- Natural track progression via `/api/playback/track-change`

**Flow**:
1. User selects device → stored in session
2. Playback initiated with first queue track
3. Client polls `/api/playback/state` every 10 seconds
4. On track end → `/api/playback/track-change` → auto-play next track
5. Auto-repopulate when queue < 5 tracks

### Voting System (`app/api/vote/`)

**Backend Implementation** (Complete):
- API routes: `/api/vote/skip` and `/api/vote/like`
- WebSocket events: `vote_updated`, `track_skipped`
- Vote state stored in `session.votes.skip` and `session.votes.like`

**Vote to Skip**:
- Configurable threshold (host sets in session settings)
- Each user votes once per track
- Auto-skip when threshold reached
- Votes cleared on track change
- Votes invalidated if user leaves

**Like System**:
- Toggle like/unlike current track
- Influences future queue generation (boosts similar artists)
- Stored in `session.votes.like`

**Frontend Implementation** (Complete):
- ✅ SkipVoteButton component (`src/components/voting/SkipVoteButton.tsx`)
  - Vote progress bar showing X/Y votes
  - Visual states: default, voted (green), loading
- ✅ LikeButton component (`src/components/voting/LikeButton.tsx`)
  - Heart icon with toggle like/unlike
  - Shows like count, scale animation
- ✅ VotingControls wrapper (`src/components/voting/VotingControls.tsx`)
  - WebSocket integration for real-time updates
  - Clears skip votes on track change
  - Maintains like votes across tracks
- ✅ Toast notifications for vote events

## Type Safety Rules

- **Never use `any` types** (enforced by ESLint)
- **Never use type assertions (`as Type`)** to bypass type mismatches - fix the underlying types
- All API responses must be typed
- Use Zod schemas for API input validation
- Import types from `@/types` barrel export

## Testing Structure

```
tests/
├── unit/           # Services, algorithms, utils (isolated)
├── integration/    # API routes (with mocked Spotify/Redis)
├── component/      # React components (Testing Library)
├── factories/      # Test data generation
└── mocks/          # Mock implementations (Spotify, Redis, NextAuth)
```

**Coverage thresholds**: 80% lines/functions, 75% branches

**Run single test file**:
```bash
npx vitest run tests/unit/path/to/test.test.ts
```

## Common Patterns

### Error Handling
- Use `createErrorResponse(error, "Context Name")` in all API routes
- Log with context tags: `console.log("[Context] Message")`
- Spotify API errors typed via `SpotifyError` interface

### Component Patterns
- Use `"use client"` directive for client components
- TypeScript interfaces for all props
- Local state for loading/error states
- Try/catch with console.error for async actions
- `useSocket` hook for real-time updates

### Service Instantiation
```typescript
const service = new SpotifyService(session.accessToken);
// OR with rate limiting
const result = await spotifyRateLimiter.execute(() =>
  spotifyApi.someMethod()
);
```

## Environment Setup

**Required for development**:
1. Add to `/etc/hosts`: `127.0.0.1 dev.local`
2. Spotify Developer App with redirect URI: `https://dev.local:3000/api/auth/callback/spotify`
3. `.env` file with SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, NEXTAUTH_SECRET

**HTTPS requirement**: Spotify enforces HTTPS with custom domain (2025+ security policy)

## Important Files

**Architecture**:
- `server.ts` - Custom HTTPS server with Socket.IO initialization
- `src/auth.ts` - NextAuth config with token refresh
- `src/lib/session/store.interface.ts` - Storage abstraction
- `src/lib/websocket/server.ts` - WebSocket server & Redis pub/sub bridge
- `src/lib/queue-background-regen.ts` - Background queue regeneration logic
- `src/lib/algorithm/scoring.ts` - Track scoring algorithm

**Type definitions**:
- `src/types/session.ts` - Core session types
- `src/types/websocket.ts` - WebSocket event types
- `src/types/next-auth.d.ts` - NextAuth session extensions

## Common Issues

### WebSocket not working
- Ensure using `npm run dev` (custom server required)
- Check Redis is running if `SESSION_STORE=redis`
- Verify `broadcastToSession` uses Redis pub/sub pattern
- Look for `[WebSocket] Socket.IO server initialized` in logs

### Queue not regenerating
- Check logs: `[QueueRegen]`
- Verify session has profile (analyzeUserTaste may fail)
- Check for regeneration locks via getRegenerationStatus

### Spotify API errors
- Rate limiting: spotifyRateLimiter handles 429s automatically
- Token expiry: NextAuth auto-refreshes
- Missing scopes: Check SPOTIFY_SCOPES in auth.ts

### Type errors
- Never use `any` - ESLint will catch
- Never use `as Type` casts - fix underlying types
- Import from `@/types` barrel export
