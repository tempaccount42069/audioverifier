require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
// Shared secret the game server must send to authenticate requests
const SHARED_SECRET = process.env.PROXY_SECRET || "CHANGE_ME_TO_A_LONG_RANDOM_STRING";

// Your game's Universe ID (find on Creator Dashboard → Experience → URL)
const UNIVERSE_ID = process.env.UNIVERSE_ID || "YOUR_UNIVERSE_ID_HERE";

// API keys for each account/group that owns audios.
// Each entry: { name, apiKey }
// The API key must have "assets" permission with Write scope.
const API_KEYS = JSON.parse(process.env.API_KEYS || "[]");
// Example environment variable:
// API_KEYS=[{"name":"GroupBot1","apiKey":"abc123"},{"name":"GroupBot2","apiKey":"def456"}]

// ─── ENDPOINT ────────────────────────────────────────────────────────────────
app.post("/grant-audio", async (req, res) => {
  const { secret, assetId } = req.body;

  // Validate shared secret
  if (secret !== SHARED_SECRET) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  // Validate asset ID
  const numericId = Number(assetId);
  if (!numericId || numericId <= 0) {
    return res.status(400).json({ success: false, error: "Invalid assetId" });
  }

  const payload = {
    subjectType: "Universe",
    subjectId: UNIVERSE_ID,
    action: "Use",
    requests: [
      {
        assetId: numericId,
        grantToDependencies: true,
        parentVersionNumber: 0,
      },
    ],
    enableDeepAccessCheck: true,
  };

  // Try each API key until one succeeds
  for (const entry of API_KEYS) {
    try {
      const response = await fetch(
        "https://apis.roblox.com/asset-permissions-api/v1/assets/permissions",
        {
          method: "PATCH",
          headers: {
            "x-api-key": entry.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const text = await response.text();
      console.log(`[DEBUG] Key "${entry.name}" status=${response.status} body=${text}`);
      
      let data;
      try { data = JSON.parse(text); } catch (e) { data = {}; }

      if (
        response.ok &&
        data.successAssetIds &&
        data.successAssetIds.includes(numericId)
      ) {
        console.log(
          `[GRANTED] Asset ${numericId} → Universe ${UNIVERSE_ID} via ${entry.name}`
        );
        return res.json({ success: true, grantedBy: entry.name });
      }

      // Log the full error and continue to next key
      console.warn(`[FAIL] Key "${entry.name}" for asset ${numericId}: ${text}`);
    } catch (err) {
      console.error(`[ERROR] Key "${entry.name}" fetch failed:`, err.message);
      continue;
    }
  }

  // None of the keys could grant permission
  return res.json({
    success: false,
    error: "No API key could grant permission for this asset",
  });
});

// Health check
app.get("/", (req, res) => res.json({ status: "ok" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ─── START ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Audio verify proxy running on ${HOST}:${PORT}`);
  console.log(`Configured with ${API_KEYS.length} API key(s)`);
  console.log(`Target Universe: ${UNIVERSE_ID}`);
});
