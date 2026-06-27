// Brogent-shaped HTTP surface the AgentOS React Native client calls.
// Contract source: mobile/src/lib/brogent-api.ts
//   POST  /api/projects                 { prompt, handle } → 201 { id, slug, status }
//   GET   /api/projects/:id             → { id, slug, status, app_url, error? }
//   GET   /api/projects/:id/stream      SSE: ready / plan / build / deploy / final / warn / error / timeout
//   (also kept: GET /api/projects, GET /api/projects/:id/log, GET .../events alias)

import express from "express";
import { startBuild, getBuildLog } from "../lib/build-flow.js";
import { listApps, getApp } from "../lib/registry.js";
import { paperclip, mapStatus } from "../lib/paperclip.js";

export const projects = express.Router();

projects.post("/projects", async (req, res) => {
  const { prompt, tier, handle } = req.body ?? {};
  if (typeof prompt !== "string" || prompt.trim().length < 4) {
    return res.status(400).json({ error: "prompt is required (>= 4 chars)" });
  }
  if (tier !== undefined && ![1, 2, 3].includes(Number(tier))) {
    return res.status(400).json({ error: "tier must be 1, 2, or 3 (or omit for auto-classify)" });
  }
  try {
    const app = await startBuild({ prompt: prompt.trim(), tierOverride: tier });
    // The mobile parses only id/slug/status from the create response.
    res.status(201).json(toBrogentShape(app));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

projects.get("/projects", async (_req, res) => {
  const apps = await listApps();
  res.json(apps.map(toBrogentShape));
});

projects.get("/projects/:slug", async (req, res) => {
  const app = await getApp(req.params.slug);
  if (!app) return res.status(404).json({ error: "not found" });
  if (app.issueId && ["queued", "building", "planning", "verifying"].includes(app.status)) {
    try {
      const issue = await paperclip.getIssue(app.issueId);
      const active = await paperclip.activeRun(app.issueId).catch(() => null);
      const live = mapStatus(issue, !!active);
      if (["queued", "building", "planning", "verifying"].includes(live)) {
        app.status = live;
      }
    } catch {}
  }
  res.json(toBrogentShape(app));
});

projects.get("/projects/:slug/log", async (req, res) => {
  const log = getBuildLog(req.params.slug);
  res.json({ slug: req.params.slug, lines: log });
});

// Two paths, same SSE handler: /stream is what the mobile expects, /events is
// the older name kept for the curl examples + docs.
projects.get("/projects/:slug/stream", buildSseHandler);
projects.get("/projects/:slug/events", buildSseHandler);

async function buildSseHandler(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const slug = req.params.slug;

  // `ready` MUST be the first event — the mobile uses it to confirm the
  // stream is open + get the initial status.
  const initial = await getApp(slug).catch(() => null);
  if (!initial) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: "not found" })}\n\n`);
    return res.end();
  }
  res.write(`event: ready\ndata: ${JSON.stringify({ project: slug, status: initial.status })}\n\n`);

  let sentLogCount = 0;
  let lastStatus = initial.status;
  let finalSent = false;

  // Already terminal? Emit `final` immediately and close.
  if (["completed", "live"].includes(initial.status)) {
    res.write(`event: final\ndata: ${JSON.stringify({ status: "done", app_url: initial.url ?? null })}\n\n`);
    return res.end();
  }
  if (initial.status === "failed") {
    res.write(`event: final\ndata: ${JSON.stringify({ status: "failed", app_url: null })}\n\n`);
    return res.end();
  }

  const sendFinal = (status, app_url) => {
    if (finalSent) return;
    finalSent = true;
    res.write(`event: final\ndata: ${JSON.stringify({ status, app_url })}\n\n`);
    clearInterval(timer);
    try { res.end(); } catch {}
  };

  const send = async () => {
    const log = getBuildLog(slug);
    for (let i = sentLogCount; i < log.length; i++) {
      const line = log[i];
      // Map agentos-api stages to Brogent stage events. Everything goes
      // through `build` by default; deploy stages get their own name.
      const eventName = mapStageEvent(line.stage);
      const payload = {
        id: `${slug}-${i}`,
        project: slug,
        agent: line.stage,
        stage: eventName,
        message: line.line,
        data: null,
        ts: new Date(line.ts).toISOString(),
      };
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
    }
    sentLogCount = log.length;

    const app = await getApp(slug).catch(() => null);
    if (!app) return;

    if (app.status !== lastStatus) {
      lastStatus = app.status;
    }

    if (["completed", "live"].includes(app.status)) {
      sendFinal("done", app.url ?? null);
    } else if (app.status === "failed") {
      sendFinal("failed", null);
    }
  };

  const timer = setInterval(send, 1000);
  send();

  req.on("close", () => {
    clearInterval(timer);
  });
}

function mapStageEvent(stage) {
  if (!stage) return "build";
  if (stage.startsWith("deploy") || stage.startsWith("compose") || stage.startsWith("npm") || stage.startsWith("next")) return "deploy";
  if (stage === "paperclip") return "build";
  if (stage === "snapshot") return "provision";
  return "build";
}

/** Mobile expects `app_url`. We keep `url` too for non-mobile callers. */
function toBrogentShape(app) {
  return {
    id: app.slug,
    slug: app.slug,
    prompt: app.prompt,
    tier: app.tier,
    reasoning: app.reasoning,
    status: app.status,
    app_url: app.url ?? null,
    url: app.url ?? null,
    port: app.port,
    agentName: app.agentName,
    externalApis: app.external_apis ?? [],
    error: app.lastError ?? undefined,
    lastError: app.lastError ?? null,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}
