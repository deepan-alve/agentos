// Tier classifier — calls Vertex AI Gemini directly (no Gemini CLI).
// Uses a service account access token. ~1-2s round trip, fractions of a cent.

import { spawnSync } from "node:child_process";
import { VERTEX } from "../config.js";

let cachedToken = { token: null, expiresAt: 0 };

function freshToken() {
  if (Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const r = spawnSync("gcloud", [
    "auth", "application-default", "print-access-token",
  ], {
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: VERTEX.saPath },
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error("gcloud token failed: " + r.stderr);
  const token = r.stdout.trim();
  // Tokens are valid for ~1h; cache for 55 min.
  cachedToken = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return token;
}

const SYSTEM = `You are a build-classification AI for AgentOS, a phone-OS that builds web apps from prompts. Classify each prompt into exactly one tier:

- tier 1 (static): single-user, stateless or localStorage-only, no backend, no external API calls. Examples: calculator, tic-tac-toe, timer, unit converter, drawing canvas, mood tracker (local only), flashcards (local only).
- tier 2 (server): server-backed but no DB or auth. Calls external APIs. No per-user accounts. Caches but doesn't persist user data.
- tier 3 (full): needs accounts, user data persistence, or multi-user shared state. Examples: notes shared with friends, todos that sync across devices, chat, social feed, kanban, journal with account.

If ambiguous, bias toward the SIMPLER tier (1 > 2 > 3) because simple builds are 10x faster. A "notes app" without explicit multi-user is tier 1. "Notes I can share with my team" is tier 3.

For tier 2: STRONGLY PREFER free, key-less public APIs. Map common categories to free APIs:

| Category | Free no-key API |
|---|---|
| weather/forecast | open-meteo.com (free, no key, geocoding included) |
| geocoding/places | nominatim.openstreetmap.org |
| currency/exchange | open.er-api.com (free, no key) |
| jokes | official-joke-api.appspot.com |
| quotes | api.quotable.io |
| numbers/trivia | numbersapi.com |
| public IP / ipgeo | ipapi.co/json (free, no key, 30k/mo) |
| hacker news | hacker-news.firebaseio.com (free, no key) |
| reddit (public read) | www.reddit.com/r/<sub>.json (free, no key) |
| cat / dog facts | catfact.ninja, dog-api.kotworks.cyou |
| bored idea | boredapi.com |
| pokémon | pokeapi.co |
| public github | api.github.com (60/hr unauth; only flag key if private repo) |
| anime / movies | jikan.moe (anime), publicly listed TMDb/OMDb if key-free tier |

Output the picked API in external_apis as { "name": "...", "url": "...", "needs_key": false }.

Only mark needs_key: true when no free no-key alternative exists for the prompt's category (e.g., private GitHub repos, OpenAI calls, paid news).

Respond ONLY in JSON with this shape:
{
  "tier": 1,
  "reasoning": "one short sentence",
  "external_apis": [{ "name": "open-meteo", "url": "https://api.open-meteo.com/v1/forecast", "needs_key": false }]
}

For tier 1 and 3, external_apis is [].`;

// Vertex's response_schema doesn't accept INTEGER enum values — must use STRING.
const SCHEMA = {
  type: "OBJECT",
  required: ["tier", "reasoning", "external_apis"],
  properties: {
    tier: { type: "STRING", enum: ["1", "2", "3"] },
    reasoning: { type: "STRING" },
    external_apis: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["name", "needs_key"],
        properties: {
          name: { type: "STRING" },
          url: { type: "STRING" },
          needs_key: { type: "BOOLEAN" },
        },
      },
    },
  },
};

export async function classify(prompt) {
  const token = freshToken();
  const url = `https://${VERTEX.location}-aiplatform.googleapis.com/v1/projects/${VERTEX.project}/locations/${VERTEX.location}/publishers/google/models/${VERTEX.classifierModel}:generateContent`;

  // Retry on 429 / 503 with exponential backoff.
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(8000, 500 * Math.pow(2, attempt));
      await new Promise((r) => setTimeout(r, backoffMs));
    }
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (r.ok) {
      const json = await r.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("classify: empty response");
      const parsed = JSON.parse(text);
      return { ...parsed, tier: Number(parsed.tier) };
    }
    if (r.status !== 429 && r.status !== 503) {
      throw new Error("classify failed: " + r.status + " " + (await r.text()).slice(0, 300));
    }
    lastErr = await r.text();
  }
  throw new Error("classify exhausted retries: " + (lastErr ?? "").slice(0, 300));
}
