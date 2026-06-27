// Deploy hook — runs after a Vela marks an issue `done`.
// Reads the agent's workspace, packages it as a docker-compose stack, brings it up.

import fs from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { APPS_ROOT, LAN_HOST, TEMPLATES } from "../config.js";
import { upsertApp } from "./registry.js";
import { randomSecret } from "./slug.js";

/**
 * Copy the agent's workspace into a per-app snapshot dir so concurrent
 * Paperclip auto-recovery on a blocked issue can't race-wipe our build.
 * Uses cp -a for speed and faithfulness.
 */
async function snapshotWorkspace(agentWorkspace, slug, onLog) {
  const buildDir = path.join(APPS_ROOT, slug);
  await fs.mkdir(buildDir, { recursive: true });
  // Wipe stale build dir from any prior attempt for this slug.
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });
  onLog("snapshot", `copying ${agentWorkspace} → ${buildDir}`);
  const r = spawnSync("cp", ["-a", agentWorkspace + "/.", buildDir + "/"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`snapshot cp failed: ${r.stderr}`);
  // Drop node_modules from the snapshot — we re-install for clean state.
  await fs.rm(path.join(buildDir, "node_modules"), { recursive: true, force: true });
  return buildDir;
}

/** Run a shell command and stream output. Resolves with exit code. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => { stdout += d; opts.onLine?.("stdout", d.toString()); });
    child.stderr.on("data", (d) => { stderr += d; opts.onLine?.("stderr", d.toString()); });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, stdout, stderr }));
  });
}

/**
 * Locate the workspace where the agent's code lives. Paperclip stages an
 * execution workspace per agent at:
 *   ~/.paperclip/instances/default/workspaces/<agent-id>/
 * The agent does `cp -r template ./` then extends, so the workspace root
 * is the project root.
 */
async function findAgentWorkspace(agentId) {
  const base = `${process.env.HOME}/.paperclip/instances/default/workspaces/${agentId}`;
  // Sanity: ensure package.json exists (proves the template was copied).
  try {
    await fs.access(path.join(base, "package.json"));
    return base;
  } catch {
    return null;
  }
}

/**
 * Detect which tier an agent's workspace is — based on which template
 * fingerprint it has.
 */
async function detectTier(workspace) {
  const hasAppwriteServer = await exists(path.join(workspace, "src/lib/appwrite-server.ts"));
  const hasFetchHelper = await exists(path.join(workspace, "src/lib/fetch-with-cache.ts"));
  const hasNginxConf = await exists(path.join(workspace, "nginx.conf"));
  if (hasAppwriteServer) return 3;
  if (hasFetchHelper) return 2;
  if (hasNginxConf) return 1;
  return null;
}
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

/**
 * Substitute {{SLUG}} and {{APP_PORT}} placeholders in the compose file.
 * Also writes per-app .env for tier 3.
 */
async function preparePerAppFiles({ workspace, slug, port, tier, externalApis = [], appwrite = null }) {
  // 1. Patch docker-compose.yml
  const composePath = path.join(workspace, "docker-compose.yml");
  let compose = await fs.readFile(composePath, "utf8");
  compose = compose.replaceAll("{{SLUG}}", slug).replaceAll("{{APP_PORT}}", String(port));
  await fs.writeFile(composePath, compose);

  // 2. Write .env for compose interpolation
  const envLines = [];
  if (tier === 3 && appwrite) {
    envLines.push(`APPWRITE_ENDPOINT=${appwrite.endpoint}`);
    envLines.push(`APPWRITE_PROJECT_ID=${appwrite.projectId}`);
    envLines.push(`APPWRITE_API_KEY=${appwrite.apiKey}`);
    envLines.push(`APPWRITE_DATABASE_ID=${appwrite.databaseId}`);
    envLines.push(`NEXT_PUBLIC_APPWRITE_ENDPOINT=${appwrite.endpoint}`);
    envLines.push(`NEXT_PUBLIC_APPWRITE_PROJECT=${appwrite.projectId}`);
    envLines.push(`NEXT_PUBLIC_APPWRITE_DB=${appwrite.databaseId}`);
  }
  if (tier === 2) {
    // External API keys — leave empty placeholders the user can fill later.
    for (const api of externalApis) {
      const name = typeof api === "string" ? api : api?.name;
      const needsKey = typeof api === "string" ? true : !!api?.needs_key;
      if (!name || !needsKey) continue;
      const key = name.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_API_KEY";
      envLines.push(`${key}=`);
    }
  }
  if (envLines.length) {
    await fs.writeFile(path.join(workspace, ".env"), envLines.join("\n") + "\n");
  }

  // For Tier 3, also write `.env.production` containing ONLY the NEXT_PUBLIC_*
  // values. This file is NOT in .dockerignore so it gets copied into the
  // Docker builder stage, where `npx next build` reads it and bakes the
  // values into the client bundle. Server-only secrets stay out of it.
  if (tier === 3 && appwrite) {
    const publicEnv = [
      `NEXT_PUBLIC_APPWRITE_ENDPOINT=${appwrite.endpoint}`,
      `NEXT_PUBLIC_APPWRITE_PROJECT=${appwrite.projectId}`,
      `NEXT_PUBLIC_APPWRITE_DB=${appwrite.databaseId}`,
    ];
    await fs.writeFile(path.join(workspace, ".env.production"), publicEnv.join("\n") + "\n");
  }
}

/**
 * Bring the stack up. Builds and starts in detached mode. Returns once
 * `docker compose up -d --build` exits.
 */
async function dockerComposeUp(workspace, slug, onLine) {
  return run("docker", [
    "compose", "-p", `agentos-${slug}`, "up", "-d", "--build",
  ], { cwd: workspace, onLine });
}

/**
 * Poll the public URL until it returns any HTTP response, or timeout.
 */
async function waitHealthy(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

/**
 * Run the local build (npm install + next build) if the agent didn't.
 * Agents are LLMs — fragile at running shell. Deploy is deterministic.
 * Tier 1 produces `out/`. Tier 2/3 produce `.next/standalone`.
 */
async function ensureBuiltLocally(workspace, tier, onLog) {
  const hasArtifact =
    tier === 1
      ? await exists(`${workspace}/out/index.html`)
      : await exists(`${workspace}/.next/standalone/server.js`);
  if (hasArtifact) {
    onLog("deploy", "agent already built locally — skipping local install/build");
    return;
  }
  onLog("deploy", `agent didn't produce ${tier === 1 ? "out/" : ".next/standalone/"} — running npm install + next build`);

  // Clean any pnpm-lock that Vela may have committed; we use npm.
  await fs.rm(`${workspace}/pnpm-lock.yaml`, { force: true });
  await fs.rm(`${workspace}/node_modules`, { recursive: true, force: true });

  let r = await run("npm", ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"], {
    cwd: workspace,
    onLine: (s, l) => onLog(`npm/${s}`, l.trimEnd()),
  });
  if (r.code !== 0) {
    // npm sometimes fails the first time on sharp partial extraction. Retry once.
    onLog("deploy", "npm install failed; retrying after node_modules wipe");
    await fs.rm(`${workspace}/node_modules`, { recursive: true, force: true });
    r = await run("npm", ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"], {
      cwd: workspace,
      onLine: (s, l) => onLog(`npm/${s}`, l.trimEnd()),
    });
    if (r.code !== 0) throw new Error(`npm install failed (rc=${r.code}): ${r.stderr.slice(-300)}`);
  }

  // Tier 3 (Appwrite) does NOT need a migration step — Appwrite manages schema
  // via the bootstrap.ts that runs on first server boot.

  const buildRes = await run("npx", ["next", "build"], {
    cwd: workspace,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    onLine: (s, l) => onLog(`next/${s}`, l.trimEnd()),
  });
  if (buildRes.code !== 0) throw new Error(`next build failed (rc=${buildRes.code}): ${buildRes.stderr.slice(-300)}`);
  onLog("deploy", "next build succeeded locally");
}

/**
 * Restore the locked stack files from the template before building.
 *
 * Agents frequently "helpfully" re-scaffold — swapping in Next 14, Tailwind v3,
 * a custom postcss config, next/font, etc. — which breaks the build. The agent
 * only legitimately owns page.tsx + app routes/components, so every file that
 * defines the stack (build config, deps, layout, design tokens, UI kit) is
 * copied back from the template here. Idempotent.
 */
async function refreshDockerfile(workspace, tier) {
  const tierName = tier === 1 ? "static" : tier === 2 ? "server" : "appwrite";
  const tpl = `${process.env.HOME}/Documents/Padaipu/AgentOs/paperclip/templates/agentos-app-${tierName}`;

  const lockedFiles = [
    "Dockerfile", "docker-compose.yml", "nginx.conf", ".dockerignore",
    "next.config.mjs", "package.json", "postcss.config.mjs", "tsconfig.json",
    "src/app/layout.tsx", "src/app/globals.css", "src/lib/utils.ts",
  ];
  for (const rel of lockedFiles) {
    const src = `${tpl}/${rel}`;
    try {
      await fs.access(src);
    } catch {
      continue; // not present in this tier's template
    }
    await fs.mkdir(`${workspace}/${rel}`.replace(/\/[^/]+$/, ""), { recursive: true });
    await fs.copyFile(src, `${workspace}/${rel}`);
  }

  // Restore the UI kit wholesale (template ships it; agent must not edit it).
  const kitSrc = `${tpl}/src/components/ui`;
  try {
    await fs.access(kitSrc);
    await fs.rm(`${workspace}/src/components/ui`, { recursive: true, force: true });
    await fs.cp(kitSrc, `${workspace}/src/components/ui`, { recursive: true });
  } catch {
    // tier has no UI kit — fine
  }
}

/**
 * Full deploy. Called from /api/projects flow after the agent finishes.
 *
 * @param {object} params
 * @param {string} params.slug
 * @param {string} params.agentId         — which Vela built it
 * @param {number} params.tier
 * @param {number} params.port            — pre-allocated by registry
 * @param {string[]} [params.externalApis]
 * @param {(stage:string, line:string)=>void} [params.onLog]
 */
export async function deploy({ slug, agentId, tier, port, externalApis = [], appwrite = null, onLog = () => {} }) {
  onLog("deploy", `tier=${tier} slug=${slug} port=${port}`);

  const agentWs = await findAgentWorkspace(agentId);
  if (!agentWs) throw new Error(`no agent workspace at ${process.env.HOME}/.paperclip/instances/default/workspaces/${agentId}`);
  onLog("deploy", `agent workspace: ${agentWs}`);

  // Snapshot to per-app build dir — agentWs is shared, can be wiped by
  // Paperclip's auto-recovery if it re-wakes the blocked agent.
  const workspace = await snapshotWorkspace(agentWs, slug, onLog);
  onLog("deploy", `build workspace: ${workspace}`);

  const detected = await detectTier(workspace);
  if (detected && detected !== tier) {
    onLog("deploy", `WARN: workspace looks like tier ${detected}, expected ${tier}. Proceeding with workspace tier.`);
    tier = detected;
  }

  await refreshDockerfile(workspace, tier);
  await ensureBuiltLocally(workspace, tier, onLog);
  await preparePerAppFiles({ workspace, slug, port, tier, externalApis, appwrite });
  onLog("deploy", "wrote .env + patched compose");

  onLog("deploy", "docker compose up -d --build (this can take several minutes)");
  const result = await dockerComposeUp(workspace, slug, (stream, line) => {
    onLog(`compose/${stream}`, line.trimEnd());
  });
  if (result.code !== 0) throw new Error(`docker compose exited ${result.code}: ${result.stderr.slice(-400)}`);

  const url = `http://${LAN_HOST}:${port}`;
  onLog("deploy", `waiting for healthy: ${url}`);
  const healthy = await waitHealthy(url);
  onLog("deploy", healthy ? `healthy: ${url}` : `WARN: not healthy after 90s — app may still be starting`);

  await upsertApp(slug, {
    slug, tier, port, url, agentId, workspace,
    status: healthy ? "live" : "starting",
  });

  return { url, healthy };
}

/** Tear down an app's stack (for redeploy or cleanup). */
export async function teardown(slug, workspace) {
  if (!workspace) return;
  await run("docker", ["compose", "-p", `agentos-${slug}`, "down", "-v"], { cwd: workspace });
}
