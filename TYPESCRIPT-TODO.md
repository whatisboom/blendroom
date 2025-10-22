# TypeScript Review TODO

## Progress Summary
- ✅ Completed: 11/24 issues (46%)
- 🔄 In Progress: 0/24 issues
- ⏳ Remaining: 13/24 issues

## High Priority Issues

### ✅ [COMPLETED] [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/auth.ts:49
**Issue**: Using type assertion to cast token.accessTokenExpires
**Fix**: Use proper type narrowing and validation instead of assertion
**Code**:
```typescript
// Current code (line 49)
if (Date.now() < (token.accessTokenExpires as number)) {
```
**Should be**:
```typescript
if (typeof token.accessTokenExpires === 'number' && Date.now() < token.accessTokenExpires) {
```

### ✅ [COMPLETED] [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/auth.ts:59-61
**Issue**: Multiple type assertions in session callback (FIXED)

### ✅ [COMPLETED] [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/auth.ts:89
**Issue**: Type assertion for refresh token (FIXED)

### ✅ [COMPLETED] [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/lib/services/spotify.service.ts:21,32,75,90,105,116
**Issue**: Multiple type assertions when handling Spotify API responses (FIXED - Added array validation checks)

### ✅ [COMPLETED] [Non-null Assertions] File: /Users/brandon/projects/spotify-collab-app/src/auth.ts:26-27,43,58
**Issue**: Using non-null assertion operator (!) instead of proper validation
**Fix**: Validate environment variables at startup and handle missing values
**Code**:
```typescript
// Current code
clientId: process.env.SPOTIFY_CLIENT_ID!,
clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
accessTokenExpires: account.expires_at! * 1000,
session.user.id = token.sub!;
```
**Should be**:
```typescript
// Validate at module level
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  throw new Error('Missing required Spotify credentials in environment variables');
}

// Use validated values
clientId: SPOTIFY_CLIENT_ID,
clientSecret: SPOTIFY_CLIENT_SECRET,

// For optional values, use proper checks
accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now(),
session.user.id = token.sub || '',
```

## Medium Priority Issues

### ✅ [COMPLETED] [Weak Typing] File: /Users/brandon/projects/spotify-collab-app/src/auth.ts:77
**Issue**: Using Record<string, unknown> for token parameter (FIXED - Using JWT type from next-auth/jwt)

### ✅ [COMPLETED] [Weak Typing] File: /Users/brandon/projects/spotify-collab-app/src/lib/services/spotify.service.ts:126,140,152,202
**Issue**: Using Record<string, unknown> for API options (FIXED - Created PlayOptions, PauseOptions, SkipOptions, AddToQueueOptions interfaces)

### [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/lib/session/redis-store.ts:41
**Issue**: Type assertion when parsing JSON
**Fix**: Use validation instead of blind assertion
**Code**:
```typescript
// Current code
return JSON.parse(data) as Session;
```
**Should be**:
```typescript
const parsed = JSON.parse(data);
if (!isValidSession(parsed)) {
  throw new Error('Invalid session data from Redis');
}
return parsed;

// Add validation function
function isValidSession(data: unknown): data is Session {
  return typeof data === 'object' && data !== null &&
    'id' in data && 'code' in data && 'hostId' in data;
}
```

### [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/lib/websocket/server.ts:74
**Issue**: Type assertion for event type
**Fix**: Validate event is a valid key
**Code**:
```typescript
// Current code
const event = parts[2] as keyof ServerToClientEvents;
```
**Should be**:
```typescript
const eventName = parts[2];
if (!isValidEvent(eventName)) {
  console.error(`Invalid event: ${eventName}`);
  return;
}
const event = eventName;

function isValidEvent(event: string): event is keyof ServerToClientEvents {
  const validEvents: (keyof ServerToClientEvents)[] = [
    'participant_joined', 'participant_left', 'queue_updated', // etc
  ];
  return validEvents.includes(event as keyof ServerToClientEvents);
}
```

### [Missing Return Types] File: /Users/brandon/projects/spotify-collab-app/src/hooks/useSocket.ts:11
**Issue**: Missing explicit return type for custom hook
**Fix**: Define return type interface
**Code**:
```typescript
// Current code
export function useSocket({ sessionId, autoConnect = true }: UseSocketOptions = {}) {
```
**Should be**:
```typescript
interface UseSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  isJoined: boolean;
}

export function useSocket({ sessionId, autoConnect = true }: UseSocketOptions = {}): UseSocketReturn {
```

### [Missing Return Types] File: /Users/brandon/projects/spotify-collab-app/src/components/ui/ToastProvider.tsx:117
**Issue**: Missing return type for useToast hook
**Fix**: Define explicit return type
**Code**:
```typescript
// Current code
export function useToast() {
```
**Should be**:
```typescript
export function useToast(): ToastContextType {
```

## Low Priority Issues

### [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/components/queue/SortableQueueList.tsx:193
**Issue**: Type assertion for drag event ID
**Fix**: Validate the ID type
**Code**:
```typescript
// Current code
setActiveId(event.active.id as string);
```
**Should be**:
```typescript
const id = event.active.id;
if (typeof id === 'string') {
  setActiveId(id);
}
```

### [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/app/api/playback/play/route.ts:95
**Issue**: Type assertion for PlaybackState
**Fix**: Validate the state object structure
**Code**:
```typescript
// Current code
broadcastToSession(sessionId, "playback_state_changed", playbackState as PlaybackState);
```
**Should be**:
```typescript
// Validate before broadcasting
if (isValidPlaybackState(playbackState)) {
  broadcastToSession(sessionId, "playback_state_changed", playbackState);
}
```

### [Type Assertions] File: /Users/brandon/projects/spotify-collab-app/src/lib/queue-background-regen.ts:81-82
**Issue**: Type assertions for error handling
**Fix**: Use proper error type checking
**Code**:
```typescript
// Current code
message: (error as Error).message,
stack: (error as Error).stack,
```
**Should be**:
```typescript
message: error instanceof Error ? error.message : String(error),
stack: error instanceof Error ? error.stack : undefined,
```

### [Const Assertions] File: /Users/brandon/projects/spotify-collab-app/src/lib/websocket/events.ts:36
**Issue**: Using const assertion may be unnecessary
**Fix**: Consider using enum or proper object typing
**Code**:
```typescript
// Current code
} as const;
```
**Should be**:
```typescript
// Consider if const assertion is really needed or if a regular object would suffice
// Or use an enum for better type safety
export enum WS_EVENTS {
  JOIN_SESSION = 'join_session',
  // etc
}
```

### [Missing Explicit Types] File: /Users/brandon/projects/spotify-collab-app/src/app/api/playback/play/route.ts:106
**Issue**: Overly complex error type inference
**Fix**: Define proper error types
**Code**:
```typescript
// Current code
const spotifyError = error as { statusCode?: number; body?: { error?: { message?: string } } };
```
**Should be**:
```typescript
interface SpotifyError {
  statusCode?: number;
  body?: {
    error?: {
      message?: string;
    };
  };
}

function isSpotifyError(error: unknown): error is SpotifyError {
  return typeof error === 'object' && error !== null && 'statusCode' in error;
}

if (isSpotifyError(error)) {
  // handle spotify error
}
```

## Summary
- Total issues found: 24
- High priority: 6 (type assertions and non-null assertions that bypass type safety)
- Medium priority: 8 (weak typing and missing return types)
- Low priority: 10 (minor type assertions and improvements)

## Recommendations

1. **Immediate Actions**:
   - Replace all type assertions with proper type guards and validation
   - Remove non-null assertions and add proper null checking
   - Validate environment variables at startup

2. **Short-term Improvements**:
   - Define proper interfaces for all API responses
   - Add explicit return types to all functions
   - Replace Record<string, unknown> with specific interfaces

3. **Long-term Enhancements**:
   - Implement comprehensive type guards for all external data
   - Consider using a validation library like Zod for runtime type checking
   - Create a centralized error handling system with proper typed errors

4. **Best Practices Going Forward**:
   - Never use type assertions to bypass type checking
   - Always validate external data (API responses, user input, etc.)
   - Define explicit return types for all functions
   - Use discriminated unions for variant data structures
   - Prefer type narrowing over type assertions