# Spotify Collaborative Session App - Implementation Plan

> **Note:** This is a historical implementation plan. Most Phase 1 features are now complete and the app is functional. See the "Current Status Summary" section for completed features.

## Project Overview

A collaborative Spotify session app where multiple users' musical tastes algorithmically influence the playlist in real-time. Users OAuth through Spotify, join sessions, and their music preferences blend to create an intelligent, dynamic queue based on audio features and voting.

## Final Feature List

### **Phase 1: MVP Core**

**Authentication & Profile (P0)**
- OAuth login via Spotify
- Fetch and cache user's top tracks/artists
- Extract audio feature profile per user
- Session management with NextAuth

**Session Management (P0)**
- Create session (host) with unique code
- Join session via code
- Display participants list
- Leave session
- Host can end session
- Host can assign/remove DJs
- DJ privileges: playback control, skip, add tracks, reorder queue

**Taste Analysis & Algorithm (P0)**
- Fetch audio features for each user's top tracks
- Calculate aggregated session audio profile
- Generate 10-track queue based on audio feature similarity
- Keep next 3 tracks stable during regeneration
- Regenerate in background when members change (applied after current song)
- Prevent duplicate tracks in queue

**Playback Control (P0)**
- Device API integration (control user's active Spotify device) ✅ Complete
- Play/pause/skip controls (host + DJs) ✅ Complete
- Display current track with progress ✅ Complete
- Display upcoming queue (10 tracks) ✅ Complete
- Web Playback SDK integration (in-browser) - Phase 2

**Queue Management (P0)**
- View current queue
- DJs can add specific tracks to queue
- DJs can reorder queue
- Manual additions inserted at stable positions (don't disrupt next 3)

**Real-time Updates (P0)**
- WebSocket connection for all participants
- Sync current track and playback state
- Update participant list in real-time
- Update queue when regenerated
- Handle disconnections gracefully

**Voting System (P0)**
- Host configures vote-to-skip threshold
- Participants vote to skip current track
- Skip when threshold reached
- Like current track (influences future generation)
- Track votes per user (invalidate if user leaves)

**Host Controls (P0)**
- Toggle vote-to-skip on/off
- Set vote threshold
- Assign/remove DJ privileges
- End session

### **Phase 2: Enhancements**

**Advanced Algorithm**
- Genre balancing
- Energy/tempo pacing (build energy arc over time)
- Freshness factor (mix popular with deep cuts)
- Negative feedback (learn from skipped tracks)

**Session Customization**
- Set session vibe/mood
- Explicit content filter
- Era/decade preferences
- Genre inclusions/exclusions

**Analytics**
- Session stats (most played artist, genre distribution)
- User influence score
- Taste compatibility matrix
- Most liked/skipped tracks

**UX Polish**
- Session history/recap
- Track preview before it plays
- Visualizations (audio features, taste overlap)
- Mobile responsive design

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Next.js 14 (App Router)                   │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐     │  │
│  │  │  Frontend (React + TypeScript)               │     │  │
│  │  │  - Session UI                                │     │  │
│  │  │  - Player Controls                           │     │  │
│  │  │  - Participant List                          │     │  │
│  │  │  - Queue Display                             │     │  │
│  │  └──────────────────────────────────────────────┘     │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐     │  │
│  │  │  API Routes                                  │     │  │
│  │  │  - /api/auth/* (NextAuth)                    │     │  │
│  │  │  - /api/session/* (CRUD)                     │     │  │
│  │  │  - /api/playback/* (control)                 │     │  │
│  │  │  - /api/queue/* (management)                 │     │  │
│  │  │  - /api/vote/* (skip/like)                   │     │  │
│  │  └──────────────────────────────────────────────┘     │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐     │  │
│  │  │  WebSocket Server (Socket.io)                │     │  │
│  │  │  - Participant events                        │     │  │
│  │  │  - Playback sync                             │     │  │
│  │  │  - Queue updates                             │     │  │
│  │  └──────────────────────────────────────────────┘     │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐     │  │
│  │  │  Services Layer                              │     │  │
│  │  │  - TasteAnalysisService                      │     │  │
│  │  │  - QueueGenerationService                    │     │  │
│  │  │  - SpotifyService                            │     │  │
│  │  │  - SessionService                            │     │  │
│  │  └──────────────────────────────────────────────┘     │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐     │  │
│  │  │  Session Store (Abstracted)                  │     │  │
│  │  │  - InMemoryStore (default)                   │     │  │
│  │  │  - RedisStore (optional)                     │     │  │
│  │  └──────────────────────────────────────────────┘     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌─────────────────────────────────────┐
        │  Redis (Optional, docker-compose)   │
        │  - Session persistence              │
        │  - WebSocket state                  │
        └─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Spotify API  │
                    └───────────────┘
```

## Technology Stack

- **Framework**: Next.js 15.1.6 (App Router) with TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js with Spotify provider
- **Real-time**: Socket.io
- **Session Storage**: In-memory (default) or Redis (optional)
- **Spotify SDK**: spotify-web-api-node
- **State Management**: Zustand
- **Containerization**: Docker + Docker Compose

## Project Structure

```
spotify-collab-app/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .dockerignore
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                      # Landing page
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── session/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx              # Session view
│   │   │   └── create/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts           # NextAuth config
│   │       ├── session/
│   │       │   ├── create/
│   │       │   │   └── route.ts
│   │       │   ├── join/
│   │       │   │   └── route.ts
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts           # Get/delete session
│   │       │   │   ├── participants/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── djs/
│   │       │   │   │   └── route.ts       # Manage DJs
│   │       │   │   └── settings/
│   │       │   │       └── route.ts
│   │       │   └── leave/
│   │       │       └── route.ts
│   │       ├── playback/
│   │       │   ├── init/
│   │       │   │   └── route.ts           # Initialize player
│   │       │   ├── play/
│   │       │   │   └── route.ts
│   │       │   ├── pause/
│   │       │   │   └── route.ts
│   │       │   ├── skip/
│   │       │   │   └── route.ts
│   │       │   └── state/
│   │       │       └── route.ts
│   │       ├── queue/
│   │       │   ├── [sessionId]/
│   │       │   │   ├── route.ts           # Get queue
│   │       │   │   ├── add/
│   │       │   │   │   └── route.ts
│   │       │   │   ├── reorder/
│   │       │   │   │   └── route.ts
│   │       │   │   └── generate/
│   │       │   │       └── route.ts       # Trigger regeneration
│   │       └── vote/
│   │           ├── skip/
│   │           │   └── route.ts
│   │           └── like/
│   │               └── route.ts
│   │
│   ├── lib/
│   │   ├── services/
│   │   │   ├── spotify.service.ts         # Spotify API wrapper
│   │   │   ├── taste-analysis.service.ts  # Audio feature analysis
│   │   │   ├── queue-generation.service.ts # Algorithm
│   │   │   ├── session.service.ts         # Session CRUD
│   │   │   ├── voting.service.ts          # Vote management
│   │   │   └── playback.service.ts        # Playback control
│   │   │
│   │   ├── session/
│   │   │   ├── store.interface.ts         # Abstract interface
│   │   │   ├── memory-store.ts            # In-memory impl
│   │   │   └── redis-store.ts             # Redis impl
│   │   │
│   │   ├── websocket/
│   │   │   ├── server.ts                  # Socket.io setup
│   │   │   └── events.ts                  # Event definitions
│   │   │
│   │   ├── auth/
│   │   │   └── next-auth.config.ts        # Auth config
│   │   │
│   │   ├── algorithm/
│   │   │   ├── scoring.ts                 # Track scoring logic
│   │   │   ├── audio-features.ts          # Feature calculations
│   │   │   └── queue-builder.ts           # Queue construction
│   │   │
│   │   └── utils/
│   │       ├── session-code.ts            # Generate unique codes
│   │       ├── rate-limiter.ts            # Spotify rate limiting
│   │       └── spotify-client.ts          # Spotify SDK wrapper
│   │
│   ├── components/
│   │   ├── session/
│   │   │   ├── ParticipantList.tsx
│   │   │   ├── SessionHeader.tsx
│   │   │   ├── SessionSettings.tsx
│   │   │   └── JoinSessionForm.tsx
│   │   ├── player/
│   │   │   ├── PlayerControls.tsx
│   │   │   ├── NowPlaying.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── PlaybackModeSelector.tsx
│   │   ├── queue/
│   │   │   ├── QueueList.tsx
│   │   │   ├── QueueItem.tsx
│   │   │   ├── AddTrackModal.tsx
│   │   │   └── ReorderHandle.tsx
│   │   ├── voting/
│   │   │   ├── SkipVoteButton.tsx
│   │   │   ├── LikeButton.tsx
│   │   │   └── VoteProgress.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   │
│   └── types/
│       ├── session.ts
│       ├── spotify.ts
│       ├── user.ts
│       ├── queue.ts
│       └── vote.ts
│
├── public/
│   ├── favicon.ico
│   └── logo.svg
│
└── scripts/
    └── setup-env.sh
```

## Implementation Todo List

### **1. Project Setup & Configuration**
1. Initialize Next.js 14 project with TypeScript and App Router
2. Install dependencies (next-auth, socket.io, spotify-web-api-node, redis client, tailwind)
3. Configure TypeScript (strict mode, path aliases)
4. Set up Tailwind CSS with custom theme
5. Configure ESLint and Prettier
6. Create `.env.example` with required variables
7. Create Dockerfile (multi-stage build: deps → build → production)
8. Create docker-compose.yml (app + optional redis)
9. Add .dockerignore and .gitignore
10. Create basic project structure (folders)

### **2. Type Definitions**
11. Define `Session` type (id, code, hostId, participants, djs, settings, queue, votes)
12. Define `Participant` type (userId, name, joinedAt, isHost, isDJ)
13. Define `Track` type (spotify track + audio features)
14. Define `AudioFeatures` type (danceability, energy, valence, tempo, etc.)
15. Define `Vote` type (userId, type: 'skip' | 'like', trackId, timestamp)
16. Define `QueueItem` type (track, addedBy, position, isStable)
17. Define `SessionSettings` type (voteToSkip, skipThreshold, playbackMode)
18. Define WebSocket event types

### **3. Authentication Setup** ✅ COMPLETED
19. ✅ Register Spotify Developer App (get client ID/secret)
20. ✅ Configure NextAuth v4 with Spotify provider
21. ✅ Set up JWT strategy with token refresh
22. ✅ Create auth middleware for protected routes (using withAuth)
23. ✅ Add session token to include Spotify access token
24. ✅ Create login page UI
25. ✅ Create auth callback handling (NextAuth handles automatically)
26. ✅ Test OAuth flow end-to-end

**Note**: Due to Spotify's 2025 security requirements, HTTPS with a custom domain is required for local development.
- Configured Next.js with `--experimental-https` flag to auto-generate self-signed certificates
- Using `dev.local` domain (mapped to 127.0.0.1 in `/etc/hosts`)
- Spotify redirect URI: `https://dev.local:3000/api/auth/callback/spotify`

### **4. Session Store Abstraction**
27. Create `SessionStore` interface (get, set, delete, list)
28. Implement `InMemoryStore` with Map
29. Implement `RedisStore` with ioredis client
30. Create factory function to select store based on env
31. Add TTL/expiration for sessions
32. Add participant management methods
33. Add vote tracking methods
34. Test both store implementations

### **5. Spotify Service**
35. Create SpotifyService class with authenticated client
36. Implement `getUserTopTracks(userId, limit)`
37. Implement `getUserTopArtists(userId, limit)`
38. Implement `getAudioFeatures(trackIds)`
39. Implement `getRecommendations(seedTracks, targetFeatures)`
40. Implement `searchTracks(query)`
41. Implement playback control methods (play, pause, skip)
42. Implement device listing and Web Playback SDK token generation
43. Add rate limiting logic (respect 429 responses)
44. Add response caching for user data (TTL: 1 hour)

### **6. Taste Analysis Service**
45. Create TasteAnalysisService class
46. Implement `analyzeUserTaste(userId)` - fetch tracks + features
47. Implement `calculateAverageFeatures(features[])` - aggregate
48. Implement `findCommonArtists(users[])` - intersection
49. Implement `findCommonGenres(users[])` - intersection
50. Implement `generateSessionProfile(participants[])` - combine all
51. Cache user taste profiles (invalidate after 1 hour)
52. Test with diverse user combinations

### **7. Queue Generation Algorithm** ✅ COMPLETED
53. ✅ Create QueueGenerationService class
54. ✅ Implement `generateQueue(sessionProfile, currentQueue, participants)`
55. ✅ Implement track scoring function:
    - Audio feature distance from session average
    - Liked track influence (boost similar features)
    - Artist/genre popularity among participants
    - Diversity penalty (avoid same artist consecutively)
56. ✅ Implement stable queue logic (keep next 3 tracks)
57. ✅ Implement deduplication (no repeat tracks + played tracks tracking)
58. ✅ Fetch tracks from artist top tracks (replaced deprecated recommendations API)
59. ✅ Score and rank all candidate tracks
60. ✅ Return top 10 tracks
61. ✅ Add logging for algorithm decisions
62. Test with edge cases (1 user, 20 users, conflicting tastes)

**Note**: Due to Spotify's recommendations API deprecation (November 2024), the queue generation now uses:
- Artist top tracks instead of seed-based recommendations
- Shuffle and blend tracks from top 5 common artists
- Session `playedTracks` array to prevent duplicate songs across session lifetime

### **8. Session API Routes** ✅ COMPLETED
63. ✅ Create `POST /api/session/create` - generate unique code, init session
64. ✅ Create `POST /api/session/join` - add user to session, trigger regen
65. ✅ Create `GET /api/session/[id]` - return session data
66. ✅ Create `DELETE /api/session/[id]` - end session (host only)
67. ✅ Create `POST /api/session/leave` - remove user, trigger regen
68. ✅ Create `GET /api/session/[id]/participants` - list participants
69. ✅ Create `POST /api/session/[id]/djs` - add/remove DJ (host only)
70. ✅ Create `PUT /api/session/[id]/settings` - update settings (host only)
71. ✅ Add authentication checks to all routes
72. ✅ Add authorization checks (host/DJ privileges)

### **9. Queue API Routes** ✅ COMPLETED
73. ✅ Create `GET /api/queue/[sessionId]` - return current queue
74. ✅ Create `POST /api/queue/[sessionId]/add` - DJ adds track
75. ✅ Create `PUT /api/queue/[sessionId]/reorder` - DJ reorders queue
76. ✅ Create `POST /api/queue/[sessionId]/generate` - manual trigger regen
77. ✅ Add validation (DJ privileges, track exists, stable track protection)
78. ✅ Broadcast queue updates via WebSocket (queue_updated event)

### **10. Playback API Routes** ✅ COMPLETED
79. ✅ Create `POST /api/playback/init` - setup player (web or device)
80. ✅ Create `POST /api/playback/play` - start playback (host/DJ only)
81. ✅ Create `POST /api/playback/pause` - pause (host/DJ only)
82. ✅ Create `POST /api/playback/skip` - skip track (host/DJ only)
83. ✅ Create `POST /api/playback/play-from-queue` - play from specific queue position (DJ only)
84. ✅ Create `POST /api/playback/track-change` - handle natural track progression
85. ✅ Create `GET /api/playback/state` - get current playback state
86. ✅ Handle Web Playback SDK vs Device API modes
87. ✅ Broadcast playback state changes via WebSocket (playback_state_changed event)
88. ✅ Broadcast queue updates when tracks are played/skipped
89. ✅ Auto-repopulate queue when low (< 5 tracks)

### **11. Voting API Routes** ✅ COMPLETED
90. ✅ Create `POST /api/vote/skip` - vote to skip current track
91. ✅ Create `POST /api/vote/like` - like current track (toggle like/unlike)
92. ✅ Implement skip logic: check threshold, auto-skip if reached
93. ✅ Track votes per user per track (prevent duplicate votes)
94. ✅ Invalidate votes when user leaves
95. ✅ Broadcast vote counts via WebSocket (vote_updated event)
96. ✅ Broadcast track skipped event when threshold reached
97. Store liked track features for algorithm influence (ready for implementation)

### **12. WebSocket Server** ✅ COMPLETED
98. ✅ Set up Socket.io server in Next.js custom server (server.js created)
99. ✅ Create WebSocket server module (`/src/lib/websocket/server.ts`)
100. ✅ Create WebSocket type definitions (`/src/types/websocket.ts`)
101. ✅ Implement session room management (join_session, leave_session handlers)
102. ✅ Create broadcast utility function (`broadcastToSession`)
103. ✅ Update package.json scripts to use custom server
104. ✅ Integrate broadcasting into API routes:
    - ✅ `participant_joined` - session/join route
    - ✅ `participant_left` - session/leave route
    - ✅ `queue_updated` - queue routes (add, reorder, generate)
    - ✅ `playback_state_changed` - playback routes (play, pause, skip)
    - ✅ `vote_updated` - vote routes (skip, like)
    - ✅ `track_skipped` - vote/skip route when threshold reached
105. ✅ Create client-side useSocket React hook (`/src/hooks/useSocket.ts`)
106. ✅ Update session page to use WebSocket for real-time updates
107. ✅ Reduced polling to 10s intervals (only for progress bar updates)
108. ✅ Handle disconnections and cleanup
109. ✅ Server running with Socket.IO properly initialized

**Socket.io vs Native WebSockets Decision**:
Chose Socket.io for the following reasons:
- **Room Management**: Built-in rooms perfect for session architecture (`io.to(sessionId).emit()`)
- **Automatic Reconnection**: Critical for mobile/spotty connections
- **Event-Based API**: Clean event naming matches our type definitions
- **Authentication Integration**: Middleware support for JWT verification
- **Fallback Support**: Auto-downgrades to HTTP long-polling if WebSocket fails
- **Future Scaling**: Redis adapter available for horizontal scaling

Trade-offs accepted:
- Larger client bundle (~35KB vs ~2KB for native WS)
- Small protocol overhead vs native WebSocket
- Worth it for the significant reduction in boilerplate code (~500-800 lines)

### **13. Background Queue Regeneration** ✅ COMPLETED
100. ✅ Create queue regeneration trigger on participant change (`/src/lib/queue-background-regen.ts`)
101. ✅ Implement debouncing (5 second delay to batch changes)
102. ✅ Lock regeneration (prevent concurrent runs with in-memory locks)
103. ✅ Generate new queue in background
104. ✅ Keep next 3 tracks stable during regeneration
105. ✅ Merge new tracks into queue after position 3
106. ✅ Broadcast updated queue via WebSocket (`queue_updated` event)
107. ✅ Add error handling and detailed logging
108. ✅ Integrated into session join/leave routes
109. ✅ Cancel pending regeneration when session is deleted

### **14. Frontend: Landing Page** ✅ COMPLETED
108. ✅ Create landing page with hero section
109. ✅ Add "Create Session" CTA
110. ✅ Add "Join Session" form (enter code)
111. ✅ Display app features and how it works
112. ✅ Add Spotify login button
113. ✅ Style with Tailwind (modern, clean design)

### **15. Frontend: Session Creation** ✅ COMPLETED
114. ✅ Create session creation form
115. ✅ Allow host to set initial settings (vote threshold, playback mode)
116. ✅ Generate and display session code
117. ✅ Copy-to-clipboard functionality
118. ✅ Redirect to session page after creation
119. ✅ Add loading states

### **16. Frontend: Session Page Layout** ✅ COMPLETED
120. ✅ Create session page with grid layout (responsive)
121. ✅ Participant list with roles (host, DJ, member)
122. ✅ Center: Player controls and now playing
123. ✅ Queue display with track details
124. ✅ Add responsive breakpoints

### **17. Frontend: Participant List Component** ✅ COMPLETED
125. ✅ Display all participants
126. ✅ Show host badge
127. ✅ Show DJ badges
128. ✅ Host can click to assign/remove DJ role (Make DJ/Remove DJ buttons)
129. ✅ Real-time join/leave updates via WebSocket
130. ✅ Display participant count

### **18. Frontend: Player Controls** ✅ COMPLETED
131. ✅ Display current track (artwork, title, artist)
132. ✅ Show playback progress bar with time
133. ✅ Add play/pause button (host/DJ only)
134. ✅ Add skip button (host/DJ only)
135. ✅ Show playback mode indicator (web/device)
136. ✅ Disable controls for non-DJ participants
137. ✅ Add loading states during actions
138. ✅ Show device name and type with icons

### **19. Frontend: Queue Display** ✅ COMPLETED
139. ✅ Display next 10-20 tracks in queue
140. ✅ Highlight next 3 stable tracks
141. ✅ Show track info (title, artist, duration, album art)
142. ✅ Real-time queue updates via WebSocket
143. ✅ Click-to-play from queue (DJ only)
144. ✅ Add reorder drag handles (DJ only) - drag-and-drop with @dnd-kit
145. ✅ Add "Add Track" button (DJ only) - opens AddTrackModal
146. Show who added each manual track - pending implementation

### **20. Frontend: Voting UI** ⏳ IN PROGRESS
147. ❌ Add vote-to-skip button for all participants
148. ❌ Show vote progress (X/Y votes)
149. ❌ Disable after user votes
150. ❌ Add like button for current track
151. ❌ Show like count
152. ❌ Animate button states
153. ✅ Show toast when skip threshold reached (WebSocket listener exists)

**Note**: Voting API routes and WebSocket events are complete, but UI components not yet implemented.

### **21. Frontend: Add Track Modal** ✅ COMPLETED
154. ✅ Create search modal (DJ only) (`/src/components/queue/AddTrackModal.tsx`)
155. ✅ Spotify track search input with debouncing (500ms)
156. ✅ Display search results with track preview (artwork, title, artist)
157. ✅ Add track to queue on selection (`POST /api/queue/[sessionId]/add`)
158. ✅ Search API endpoint created (`/src/app/api/search/tracks/route.ts`)
159. ✅ Close modal after adding with success feedback

### **22. Frontend: Session Settings Modal** ✅ COMPLETED
160. ✅ Create settings modal (host only) (`/src/components/session/SessionSettingsModal.tsx`)
161. ✅ Toggle vote-to-skip on/off
162. ✅ Set skip threshold slider (1-20 votes)
163. ✅ Select playback mode (web/device)
164. ✅ Save settings and broadcast update via WebSocket (`session_settings_updated` event)
165. ✅ Settings update API integrated (`PUT /api/session/[id]/settings`)

### **23. Frontend: WebSocket Integration** ✅ COMPLETED
166. ✅ Create WebSocket hook (`useSocket`) with connection management
167. ✅ Connect to session room on mount with auto-join
168. ✅ Listen for participant events (participant_joined, participant_left) and update UI
169. ✅ Listen for queue updates (queue_updated) and refresh display
170. ✅ Listen for playback state changes (playback_state_changed)
171. ✅ Listen for vote updates (vote_updated, track_skipped)
172. ✅ Handle disconnections and automatic reconnect logic
173. ✅ Clean up on unmount (leave session, disconnect socket)

### **23.5. WebSocket Constants Refactoring** ✅ COMPLETED
173a. ✅ Create WebSocket event constants (`/src/lib/websocket/events.ts`)
173b. ✅ Define `WS_EVENTS` object with all event names
173c. ✅ Update all API routes to use constants instead of string literals
173d. ✅ Update WebSocket server to use constants
173e. ✅ Update client-side `useSocket` hook to use constants
173f. ✅ Update session page event listeners to use constants
173g. ✅ Add type safety and IDE autocomplete for event names

### **23.6. Toast Notification System** ✅ COMPLETED
173h. ✅ Create Toast component (`/src/components/ui/Toast.tsx`)
173i. ✅ Create ToastProvider with React Context (`/src/components/ui/ToastProvider.tsx`)
173j. ✅ Support success, error, info, warning toast types
173k. ✅ Add auto-dismiss with configurable duration
173l. ✅ Add toast animations (slide-in, fade-out) in globals.css
173m. ✅ Install lucide-react for toast icons
173n. ✅ Integrate ToastProvider into app providers
173o. ✅ Add toast notifications for all WebSocket events in session page
173p. ✅ Display toasts for participant join/leave, track skipped, DJ assigned/removed, etc.

### **24. Frontend: Web Playback SDK Integration**
172. Load Spotify Web Playback SDK script
173. Initialize player with token
174. Handle player ready event
175. Connect player to session
176. Handle playback errors
177. Update UI with player state
178. Implement device transfer if needed

### **25. UI/UX Polish**
179. Add loading skeletons for all async content
180. Add error boundaries and error states
181. Add toast notifications (success, error, info)
182. Add empty states (no queue, no participants)
183. Add animations (fade in/out, slide transitions)
184. Ensure mobile responsiveness
185. Add dark mode support (optional)
186. Test accessibility (keyboard navigation, screen readers)

### **26. Docker & Deployment**
187. Test Docker build locally
188. Test docker-compose with Redis
189. Test docker-compose without Redis (in-memory mode)
190. Optimize Docker image size (multi-stage build)
191. Add health check endpoint
192. Document environment variables
193. Create deployment guide (README)
194. Test production build

### **27. Testing & Edge Cases**
195. Test session creation and joining
196. Test participant leave during song playback
197. Test host leaving (transfer host role or end session)
198. Test DJ privileges
199. Test vote-to-skip with various thresholds
200. Test queue regeneration timing
201. Test with 1 user, 5 users, 20 users
202. Test Spotify rate limiting behavior
203. Test WebSocket disconnection and reconnection
204. Test concurrent queue operations (race conditions)

### **28. Documentation**
205. Write README with setup instructions
206. Document environment variables
207. Add architecture diagram
208. Document API endpoints
209. Document WebSocket events
210. Add algorithm explanation
211. Create user guide
212. Add troubleshooting section

## Key Implementation Details

### Queue Regeneration Flow

```typescript
// When participant joins/leaves
async function onParticipantChange(sessionId: string) {
  // 1. Debounce (wait 5s for more changes)
  await debounce(sessionId, 5000);

  // 2. Acquire lock (prevent concurrent regen)
  const lock = await acquireLock(`regen:${sessionId}`);
  if (!lock) return;

  try {
    // 3. Get current session state
    const session = await sessionStore.get(sessionId);
    const currentQueue = session.queue;

    // 4. Keep next 3 tracks stable
    const stableTracks = currentQueue.slice(0, 3);

    // 5. Generate new queue
    const profile = await tasteAnalysis.generateSessionProfile(session.participants);
    const newQueue = await queueGeneration.generateQueue(profile, session);

    // 6. Merge: [stable tracks] + [new tracks]
    const mergedQueue = [...stableTracks, ...newQueue];

    // 7. Update session
    session.queue = mergedQueue;
    await sessionStore.set(sessionId, session);

    // 8. Broadcast update
    io.to(sessionId).emit('queue_updated', mergedQueue);
  } finally {
    await releaseLock(`regen:${sessionId}`);
  }
}
```

### Vote-to-Skip Logic

```typescript
async function handleSkipVote(sessionId: string, userId: string) {
  const session = await sessionStore.get(sessionId);

  // Check if already voted
  const existingVote = session.votes.skip.find(v => v.userId === userId);
  if (existingVote) return { error: 'Already voted' };

  // Add vote
  session.votes.skip.push({ userId, timestamp: Date.now() });

  // Check threshold
  const voteCount = session.votes.skip.length;
  const threshold = session.settings.skipThreshold;

  if (voteCount >= threshold) {
    // Skip track
    await playbackService.skip(sessionId);

    // Clear votes for this track
    session.votes.skip = [];

    // Broadcast skip
    io.to(sessionId).emit('track_skipped', { voteCount });
  } else {
    // Broadcast vote count update
    io.to(sessionId).emit('vote_updated', {
      type: 'skip',
      count: voteCount,
      threshold
    });
  }

  await sessionStore.set(sessionId, session);
}
```

### Like Influence on Algorithm

```typescript
function scoreTracks(candidates: Track[], session: Session): ScoredTrack[] {
  const likedTracks = session.votes.like.map(v => v.trackId);
  const likedFeatures = likedTracks.map(id => getAudioFeatures(id));

  // Calculate "liked profile" - average features of liked tracks
  const likedProfile = averageFeatures(likedFeatures);

  return candidates.map(track => {
    let score = 0;

    // Base score: distance from session average
    score += featureDistance(track.features, session.profile.avgFeatures) * -1;

    // Boost if similar to liked tracks
    if (likedFeatures.length > 0) {
      const likeBoost = featureDistance(track.features, likedProfile) * -0.5;
      score += likeBoost * 2; // Double weight for liked influence
    }

    // Diversity penalty (avoid same artist back-to-back)
    const lastTrack = session.queue[session.queue.length - 1];
    if (lastTrack && track.artists[0].id === lastTrack.artists[0].id) {
      score -= 0.3;
    }

    // Participant match score (how many users would like this)
    let participantMatch = 0;
    session.participants.forEach(p => {
      if (trackMatchesUserTaste(track, p.tasteProfile)) {
        participantMatch += 1;
      }
    });
    score += (participantMatch / session.participants.length) * 0.5;

    return { track, score };
  }).sort((a, b) => b.score - a.score);
}
```

### Audio Feature Distance Calculation

```typescript
interface AudioFeatures {
  danceability: number;   // 0-1
  energy: number;         // 0-1
  valence: number;        // 0-1
  tempo: number;          // BPM
  acousticness: number;   // 0-1
  instrumentalness: number; // 0-1
  speechiness: number;    // 0-1
}

function featureDistance(a: AudioFeatures, b: AudioFeatures): number {
  // Normalize tempo to 0-1 scale (assuming 60-200 BPM range)
  const tempoA = (a.tempo - 60) / 140;
  const tempoB = (b.tempo - 60) / 140;

  // Calculate euclidean distance
  const diff = {
    danceability: a.danceability - b.danceability,
    energy: a.energy - b.energy,
    valence: a.valence - b.valence,
    tempo: tempoA - tempoB,
    acousticness: a.acousticness - b.acousticness,
    instrumentalness: a.instrumentalness - b.instrumentalness,
    speechiness: a.speechiness - b.speechiness,
  };

  // Weight certain features more heavily
  const weights = {
    danceability: 1.2,
    energy: 1.2,
    valence: 1.0,
    tempo: 0.8,
    acousticness: 0.6,
    instrumentalness: 0.6,
    speechiness: 0.4,
  };

  const weightedSquares = Object.entries(diff).map(([key, value]) => {
    const weight = weights[key as keyof typeof weights];
    return Math.pow(value * weight, 2);
  });

  return Math.sqrt(weightedSquares.reduce((sum, val) => sum + val, 0));
}
```

## Environment Variables

```bash
# .env.example

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Spotify API
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Session Store (optional)
SESSION_STORE=memory  # 'memory' or 'redis'
REDIS_URL=redis://localhost:6379

# WebSocket
SOCKET_IO_PATH=/api/socketio
```

## Docker Configuration

### Dockerfile

```dockerfile
# Multi-stage build for optimal image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
      - SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}
      - SESSION_STORE=${SESSION_STORE:-memory}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
```

## Scaling Considerations

### Current MVP Architecture (5-20 users)
- Single Node.js container
- In-memory or Redis session store
- Synchronous algorithm execution
- Single WebSocket server

### Future Scaling (100+ users)
When scaling becomes necessary:

1. **Extract Algorithm to Workers**
   - Add Bull/BullMQ job queue
   - Run algorithm in separate worker processes
   - Prevents blocking main API thread

2. **Horizontal Scaling**
   - Add load balancer (nginx/traefik)
   - Run multiple app instances
   - Socket.io Redis adapter for WebSocket sync

3. **Caching Layer**
   - Cache user taste profiles
   - Cache Spotify API responses
   - Reduce API calls and computation

4. **Database for Sessions**
   - Move from Redis to PostgreSQL
   - Better durability and querying
   - Session history and analytics

## Current Status Summary

### ✅ Completed Core Features:
- Authentication with Spotify OAuth (HTTPS with custom domain for local dev)
- Session management (create, join, leave)
- Queue generation algorithm with taste analysis (artist-based)
- Playback control with device selection and initialization
- Voting system (skip & like with toggle support)
- Frontend UI (landing, session page, player controls, queue display)
- Device info display with icons in player controls
- Click-to-play from queue (DJ only)
- Auto-repopulate queue when low (< 5 tracks)
- Natural track progression handling
- **Background queue regeneration** with debouncing (5s) and locking
- **Toast notification system** with context provider for real-time feedback
- **DJ management UI** (host can assign/remove DJ privileges via buttons)
- **Add Track modal** with Spotify search and debouncing (DJ feature)
- **Session Settings modal** (host can configure vote-to-skip, threshold, playback mode)
- **WebSocket event constants** for type safety and maintainability
- **Reusable Modal component** for all modal dialogs
- **Drag-and-drop queue reordering** with stable track protection (DJ feature)

### ✅ API Routes - COMPLETED
**Session Management**:
- ✅ Create, join, leave sessions
- ✅ Participant management
- ✅ DJ role assignment
- ✅ Session settings updates

**Queue Management**:
- ✅ Get queue
- ✅ Add tracks (DJ only)
- ✅ Reorder queue with stable track protection (DJ only)
- ✅ Manual queue generation trigger

**Playback Control**:
- ✅ Initialize playback (device/web mode selection)
- ✅ Play/pause/skip controls
- ✅ Play from specific queue position
- ✅ Track natural track progression
- ✅ Get playback state

**Voting**:
- ✅ Vote to skip with threshold checking
- ✅ Like/unlike tracks

### ✅ Real-time WebSocket Integration - COMPLETED
**Server-side**:
- ✅ Socket.IO server initialized in custom Next.js server (server.js)
- ✅ Room management (join/leave session)
- ✅ Broadcast utility (`broadcastToSession`)
- ✅ Type-safe WebSocket events (`/src/types/websocket.ts`)
- ✅ All events integrated into API routes:
  - `participant_joined` - session/join route
  - `participant_left` - session/leave route
  - `queue_updated` - queue routes (add, reorder, generate, playback actions)
  - `playback_state_changed` - playback routes (play, pause, skip)
  - `vote_updated` - vote routes (skip, like)
  - `track_skipped` - vote/skip route when threshold reached

**Client-side**:
- ✅ `useSocket` React hook with connection management
- ✅ Auto-reconnection with exponential backoff
- ✅ Session room auto-join on mount
- ✅ Real-time event listeners in session page:
  - Participant join/leave updates
  - Queue updates
  - Playback state changes
  - Vote counts
- ✅ Graceful cleanup on unmount
- ✅ Reduced polling to 10s intervals (only for progress bar)

**Important**: The server must be started with `npm run dev` (which uses the custom server.js) to enable Socket.IO.

## Immediate Next Steps

### 1. Testing WebSocket with Real Users
- Open session in multiple browser windows/devices
- Verify real-time synchronization:
  - Participant join/leave updates
  - Queue changes propagate instantly
  - Playback controls sync across clients
  - Vote counts update in real-time

### 2. Optional Enhancements

## Future Enhancements (Phase 2)
- Display who added each manual track in queue
- Session analytics and history
- Advanced algorithm tuning (genre balancing, energy pacing)
- Web Playback SDK integration for in-browser playback
- Session customization (mood, explicit filter, era preferences)
- Advanced animations and visualizations
- UI/UX polish (loading skeletons, error boundaries, accessibility)
- Docker deployment and production setup
