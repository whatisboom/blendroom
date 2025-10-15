# Troubleshooting Guide

## Spotify API 403 Error

### Problem
Session creation fails with:
```
Failed to update session profile: WebapiRegularError
statusCode: 403
```

### Root Cause
The Spotify access token doesn't have the necessary permissions (scopes) to access user's top tracks and artists.

### Solution Steps

#### 1. Verify Spotify App Configuration
1. Go to your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click on your app
3. Click "Edit Settings"
4. Under "Redirect URIs", ensure you have:
   - `https://dev.local:3000/api/auth/callback/spotify`
5. Save the settings

#### 2. Add dev.local to /etc/hosts
```bash
sudo sh -c 'echo "127.0.0.1 dev.local" >> /etc/hosts'
```

#### 3. Clear Browser Session
1. Open browser developer tools
2. Go to Application/Storage tab
3. Clear all cookies and local storage for `https://dev.local:3000`
4. Close the browser

#### 4. Re-authenticate
1. Visit `https://dev.local:3000`
2. Click "Sign in with Spotify"
3. Spotify will ask for permissions including:
   - Read your top artists and content
   - Read your currently playing content
   - Read your playback state
   - Control your Spotify playback
4. Click "Agree"

#### 5. Test the API
Visit https://dev.local:3000/api/test/spotify (after logging in) to see diagnostic information about your Spotify API access.

### Required Scopes
The app needs these Spotify scopes (defined in `src/auth.ts`):
- `user-read-email` - Read user email
- `user-read-private` - Read user profile
- `user-top-read` - Get user's top tracks and artists ⚠️ **Required for session creation**
- `user-read-playback-state` - Read playback state
- `user-modify-playback-state` - Control playback
- `streaming` - Web Playback SDK
- `user-read-currently-playing` - Read currently playing track

### Still Not Working?

#### Check Token in Test Endpoint
1. Visit https://dev.local:3000/api/test/spotify
2. Look for:
   - `hasAccessToken: true`
   - `topTracksSuccess: true`
   - `topArtistsSuccess: true`

#### If topTracksSuccess is false:
- The error details will show what's wrong
- Most likely you need to log out and log back in to get updated scopes

#### Temporary Workaround
You can make profile generation non-blocking by changing `src/lib/services/session.service.ts`:

```typescript
// Before:
await this.updateSessionProfile(sessionId);

// After:
this.updateSessionProfile(sessionId).catch((err) =>
  console.error("Failed to update session profile:", err)
);
```

This allows sessions to be created even if Spotify API fails.

## HTTPS/Certificate Warnings

The app uses self-signed certificates for HTTPS (required by Spotify for OAuth).

### In Browser:
1. Visit https://localhost:3000
2. Click "Advanced" or "Show Details"
3. Click "Proceed to localhost (unsafe)" or "Accept the Risk and Continue"

### With curl:
```bash
curl -k https://localhost:3000/api/test/spotify
# or
curl --insecure https://localhost:3000/api/test/spotify
```
