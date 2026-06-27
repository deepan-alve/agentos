# agentos-api

The thin adapter the AgentOS phone app talks to. Translates `POST /api/projects { prompt }` into a Paperclip build, then deploys the result as a Docker compose stack on this host.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | service info, LAN host, Vela pool |
| `POST` | `/api/projects` | `{ prompt, tier? }` → kicks off build, returns initial state |
| `GET`  | `/api/projects` | list all builds |
| `GET`  | `/api/projects/:slug` | one build's current state |
| `GET`  | `/api/projects/:slug/log` | full log buffer |
| `GET`  | `/api/projects/:slug/events` | SSE stream of build logs + status |

## Status enum (Brogent-shaped)

`queued` → `planning` → `building` → `verifying` → `deploying` → `completed`
On error: any state → `failed`

## Run

```bash
pnpm install
pnpm start
```

The service listens on `0.0.0.0:4100`. Phone on same LAN hits `http://<LAN>:4100`.

## Architecture

```
phone → POST /api/projects { prompt }
   ↓
classify (gemini-flash-lite via Vertex) → { tier, external_apis }
   ↓
pick least-busy Vela from pool (round-robin tiebreak)
   ↓
Paperclip: create project + issue (assigned to picked Vela)
   ↓
Paperclip: wake the agent
   ↓
[background watcher loop, polls every 6s]
   ↓
issue.status == "done"
   ↓
deploy hook: docker compose -p agentos-<slug> up -d --build
   ↓
poll URL for healthy
   ↓
registry["apps"][slug].status = "completed", url = "http://<LAN>:<PORT>"
```

## Registry

State lives at `~/.agentos/registry.json`. Port allocation is monotonically increasing from 5001. Per-app workspace under `~/.paperclip/instances/default/workspaces/<agent-id>/`.

## Vela pool

3 Velas hardcoded in `src/config.js`. Each is an identical Paperclip agent (gemini_local adapter, gemini-2.5-flash, Vertex AI auth). Add more by hiring via Paperclip and appending to `VELA_POOL`.

## Adding a new tier

1. Drop a template under `templates/agentos-app-<name>/`
2. Register in `src/config.js > TEMPLATES`
3. Teach the classifier in `src/lib/classifier.js > SYSTEM`
4. Update Vela's AGENTS.md to handle it
5. Update `src/lib/deploy.js > detectTier` fingerprint
