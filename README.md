# Audio Verify Proxy

A lightweight Node.js proxy that grants Roblox audio permissions to your game's universe via the Open Cloud API.

## How it works

1. Player enters an audio ID in the boombox
2. Game server checks if the audio is playable (tries loading it)
3. If not playable → game server calls this proxy
4. Proxy uses your Open Cloud API key(s) to call `PATCH /asset-permissions-api/v1/assets/permissions`
5. This grants your game's universe "Use" permission on the audio
6. Game server retries loading the audio (should now succeed)

## Setup

### 1. Create Open Cloud API Keys

For each account/group that owns audios you want to auto-verify:

1. Go to https://create.roblox.com/credentials
2. Click **Create API Key**
3. Name it (e.g., "Audio Verifier Bot")
4. Under **Access Permissions**, add **assets** with **Read + Write**
5. Under **Accepted IP Addresses**, add your proxy server's IP (or `0.0.0.0/0` for dev)
6. Copy the generated key

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
- `PROXY_SECRET` — a long random string (must match the one in your Roblox server script)
- `UNIVERSE_ID` — your game's Universe ID (from Creator Dashboard URL)
- `API_KEYS` — JSON array of `{"name":"...", "apiKey":"..."}` entries

### 3. Install & Run

```bash
npm install
npm start
```

### 4. Deploy

Deploy to any Node.js host (Railway, Render, Fly.io, VPS, etc.) and note the URL.

### 5. Update Game Script

In the boombox server script, set:
```lua
local PROXY_URL = "https://your-deployed-proxy.com/grant-audio"
local PROXY_SECRET = "same_secret_as_in_your_.env"
```

Also enable **HttpService** in your game (Game Settings → Security → Allow HTTP Requests).

## Important Notes

- The API key can only grant permissions for audios **owned by the same account/group** that created the key
- If a player enters an audio owned by someone else (not your accounts), the proxy can't grant permission — verification will simply fail gracefully
- The proxy tries each configured API key in order until one succeeds
- Rate limits apply (~60 requests/minute per key)
