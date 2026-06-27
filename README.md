# AgentOS

Type a prompt on your phone, watch it build, open the result as a running app.

AgentOS turns a natural-language prompt into a deployed, containerized web app. This
repo holds the two parts I built:

| Folder | What it is |
|---|---|
| **`agentos-api/`** | The orchestration backend. The only service the phone talks to. It classifies the prompt, routes the build to an agent, watches it to completion, and deploys the result as an isolated Docker Compose stack. |
| **`mobile/`** | The Expo / React Native app. Type a prompt, follow live build progress over SSE, open the finished app in a WebView. |

> Code generation itself runs on **Paperclip** ([`paperclipai/paperclip`](https://github.com/paperclipai/paperclip)),
> a separate agent platform AgentOS integrates with — it is **not** part of this repo.
> `agentos-api` is the adapter and deploy layer I wrote on top of it.

## Architecture

```
mobile (Expo, phone)
   │  HTTP + SSE
   ▼
agentos-api  :4100      classify prompt → pick an agent → watch → deploy
   │  Paperclip API
   ▼
Paperclip control plane  :3100      agent pool writes the code  (third-party)
   │
   ▼
deploy hook → docker compose per app → http://<LAN>:5001-5999
```

State lives outside the code: the built-app registry in `~/.agentos/`, Paperclip's
data in `~/.paperclip/`.

## What the orchestration backend does

The interesting engineering is in `agentos-api/`:

- **Prompt classifier + tiered routing.** A cheap `gemini-flash-lite` call classifies
  each prompt into a build tier and picks the **least-busy agent** in the pool.
- **State machine + watcher.** Each build moves `queued → planning → building →
  verifying → deploying → completed` (or `failed`). A background watcher polls the
  build and drives the transitions, with a hard timeout.
- **Lock-serialized port registry.** App ports are handed out from a JSON registry
  through a promise-chain lock, so concurrent builds never collide on a port or clobber
  the registry file. (`src/lib/registry.js`)
- **Crash-safe + resumable.** On startup the server rescans the registry and restarts
  watchers for every in-flight build, so a restart never loses a build. (`resumePendingWatchers`)
- **Isolated per-app deploy behind a health gate.** Each result ships as its own
  `docker compose` stack, then the deployer polls the app URL until it's healthy before
  marking it live. (`src/lib/deploy.js`)
- **Live progress over SSE.** `GET /api/projects/:slug/events` streams build logs and
  status to the phone.

### API

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | service info, LAN host, agent pool |
| `POST` | `/api/projects` | `{ prompt, tier? }` → start a build |
| `GET`  | `/api/projects` | list builds |
| `GET`  | `/api/projects/:slug` | one build's state |
| `GET`  | `/api/projects/:slug/log` | full log buffer |
| `GET`  | `/api/projects/:slug/events` | SSE stream of logs + status |

## Run it

`agentos-api` expects a local Paperclip control plane and a Vertex AI service account.

```bash
cd agentos-api
cp .env.example .env      # fill in your Paperclip ids + Vertex project
pnpm install
pnpm start                # listens on 0.0.0.0:4100
```

```bash
cd mobile
cp .env.example .env.local   # point EXPO_PUBLIC_BROGENT_URL at your LAN IP:4100
npx expo start               # scan the QR with Expo Go on the same Wi-Fi
```

## License

MIT — see [LICENSE](LICENSE). Paperclip and any templates it ships are under their own
licenses.
