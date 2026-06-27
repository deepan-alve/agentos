// Static config + env. Source of truth for the IDs and paths we wire in.
// Phone hits this service; this service hits Paperclip.
//
// Everything instance-specific (Paperclip company/goal, agent ids, Vertex
// project) comes from the environment — see .env.example.

import os from "node:os";
import path from "node:path";

export const PORT = Number(process.env.AGENTOS_API_PORT ?? 4100);

// LAN IP — the URL we surface to the phone for built apps.
// Override via AGENTOS_LAN_HOST if auto-detect picks the wrong interface.
export const LAN_HOST = process.env.AGENTOS_LAN_HOST ?? detectLanHost();

function detectLanHost() {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const i of list ?? []) {
      if (i.family === "IPv4" && !i.internal && !i.address.startsWith("172.")) return i.address;
    }
  }
  return "127.0.0.1";
}

// Paperclip control plane (runs locally — see github.com/paperclipai/paperclip).
export const PAPERCLIP_BASE = process.env.PAPERCLIP_BASE ?? "http://127.0.0.1:3100/api";

// Paperclip home — where instances/templates live. Used to resolve template dirs.
const PAPERCLIP_HOME = process.env.PAPERCLIP_HOME ?? path.join(os.homedir(), ".paperclip");

// Paperclip company + goal the builds are filed under.
export const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID ?? "";
export const GOAL_ID = process.env.PAPERCLIP_GOAL_ID ?? "";

// Agent pools, configured as comma-separated "id:name" pairs.
//   VELA_POOL=uuid-1:Vela-2,uuid-2:Vela-3
function parsePool(raw) {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [id, name] = pair.split(":");
      return { id, name: name ?? id };
    });
}

// Vela pool — Tier 1 + Tier 2 builds.
export const VELA_POOL = parsePool(process.env.VELA_POOL);
// Helix pool — Tier 3 specialist (Appwrite).
export const HELIX_POOL = parsePool(process.env.HELIX_POOL);

// Template directories per tier (ship with Paperclip).
const TEMPLATES_ROOT = process.env.TEMPLATES_ROOT ?? path.join(PAPERCLIP_HOME, "templates");
export const TEMPLATES = {
  1: path.join(TEMPLATES_ROOT, "agentos-app-static"),
  2: path.join(TEMPLATES_ROOT, "agentos-app-server"),
  3: path.join(TEMPLATES_ROOT, "agentos-app-appwrite"),
};

// Where every built app's compose stack lives on disk: ~/.agentos/apps/<slug>/
export const APPS_ROOT = path.join(os.homedir(), ".agentos", "apps");

// JSON registry of port allocations + app metadata.
export const REGISTRY_PATH = path.join(os.homedir(), ".agentos", "registry.json");

// Port range for deployed apps.
export const PORT_RANGE = {
  min: Number(process.env.PORT_MIN ?? 5001),
  max: Number(process.env.PORT_MAX ?? 5999),
};

// Vertex AI — the classifier calls gemini-flash-lite directly (faster + cheaper
// than spawning the build CLI just to route a prompt).
export const VERTEX = {
  saPath: process.env.VERTEX_SA_PATH ?? "",
  project: process.env.VERTEX_PROJECT ?? "",
  location: process.env.VERTEX_LOCATION ?? "us-central1",
  classifierModel: process.env.VERTEX_CLASSIFIER_MODEL ?? "gemini-2.5-flash-lite",
};
