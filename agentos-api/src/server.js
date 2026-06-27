// AgentOS public API — the only service the phone talks to.
// Translates phone calls into Paperclip operations + deploys built apps.

import express from "express";
import cors from "cors";
import { PORT, LAN_HOST, COMPANY_ID, VELA_POOL } from "./config.js";
import { projects } from "./routes/projects.js";
import { resumePendingWatchers } from "./lib/build-flow.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    name: "agentos-api",
    version: "0.1.0",
    lan_host: LAN_HOST,
    company_id: COMPANY_ID,
    vela_pool: VELA_POOL.map((v) => v.name),
  });
});

app.use("/api", projects);

app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: err.message ?? "unknown" });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`[agentos-api] listening on http://${LAN_HOST}:${PORT}`);
  console.log(`[agentos-api] phone POST http://${LAN_HOST}:${PORT}/api/projects { "prompt": "..." }`);
  // Restart watchers for any pending builds.
  try {
    await resumePendingWatchers(console.log);
  } catch (e) {
    console.error("[agentos-api] resume watchers failed:", e);
  }
});
