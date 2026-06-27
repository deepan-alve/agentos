// The end-to-end build pipeline:
//   classify → assign to Vela → wake → poll for done → deploy.
//
// Runs in the background after POST /api/projects returns. The HTTP response
// is "queued / project created", and the phone polls GET /api/projects/:slug.

import { classify } from "./classifier.js";
import { pickVela, pickHelix } from "./vela-pool.js";
import { paperclip } from "./paperclip.js";
import { upsertApp, allocatePort } from "./registry.js";
import { deploy } from "./deploy.js";
import { createAppwriteProject } from "./appwrite-admin.js";
import { COMPANY_ID, GOAL_ID, TEMPLATES } from "../config.js";

function buildIssueBody({ tier, slug, prompt, externalApis, appwrite }) {
  const apiSection = (externalApis ?? []).length
    ? [
        "",
        "## External APIs (use these — they're already vetted)",
        ...externalApis.map((a) => {
          if (typeof a === "string") return `- ${a}`;
          return `- ${a.name}${a.url ? ` (${a.url})` : ""}${a.needs_key ? " — NEEDS KEY (will be in env)" : " — free, no API key needed"}`;
        }),
        "",
        "Prefer the free no-key APIs above. Do not switch to a paid alternative unless the brief explicitly demands it.",
      ]
    : [];
  const appwriteSection = appwrite
    ? [
        "",
        "## Appwrite project (already created — pass these as env)",
        `endpoint:    ${appwrite.endpoint}`,
        `project_id:  ${appwrite.projectId}`,
        `database_id: ${appwrite.databaseId}`,
        "(The API key is injected as APPWRITE_API_KEY in the per-app .env at deploy time.)",
      ]
    : [];
  return [
    "## Build Brief",
    `tier: ${tier}`,
    `slug: ${slug}`,
    `prompt: ${prompt}`,
    ...apiSection,
    ...appwriteSection,
    "",
    "## CRITICAL: clean workspace first",
    "Your cwd persists across builds. Before doing anything else, wipe leftovers from previous builds:",
    "```sh",
    "shopt -s dotglob 2>/dev/null || true",
    "rm -rf -- ./* ./.next ./out ./node_modules ./package-lock.json ./pnpm-lock.yaml",
    "```",
    "If you skip this, files from your last build (different app) will leak into this one.",
    "",
    "## Template",
    `Copy from \`${TEMPLATES[tier]}/\` into your cwd, extend, build.`,
    "",
    "## Build commands (use npm, NOT pnpm — pnpm v11 breaks the deploy image)",
    "1. `npm install --legacy-peer-deps --no-audit --no-fund`",
    "2. `npx tsc --noEmit` (typecheck — must be clean)",
    "3. `npx next build` (must succeed)",
    "4. Comment with the done summary",
    "5. Set issue status to `done`",
    "",
    "The deploy hook then runs automatically — you do NOT deploy.",
  ].filter(Boolean).join("\n");
}

/**
 * Kick off a build. Returns the registry entry so the phone gets immediate
 * state. The actual build runs in the background.
 */
export async function startBuild({ prompt, tierOverride, log = console.log }) {
  log("[build] classify:", prompt.slice(0, 80));
  const cls = tierOverride
    ? { tier: tierOverride, reasoning: "override", external_apis: [] }
    : await classify(prompt);
  log("[build] tier=" + cls.tier + " reason=" + cls.reasoning);

  // Tier 3 routes to Helix; Tiers 1/2 to Vela pool.
  const agent = cls.tier === 3 ? await pickHelix() : await pickVela();
  log("[build] picked " + agent.name + " (load=" + agent.currentLoad + ")");

  const { slugify } = await import("./slug.js");
  const slug = slugify(prompt);
  const port = await allocatePort();
  log("[build] slug=" + slug + " port=" + port);

  // Tier 3 needs an Appwrite project before we wake the agent.
  let appwrite = null;
  if (cls.tier === 3) {
    log("[build] creating Appwrite project…");
    appwrite = await createAppwriteProject(slug);
    log("[build] appwrite project=" + appwrite.projectId);
  }

  // Create Paperclip project + issue.
  const project = await paperclip.createProject({
    name: `AgentOS — ${slug}`,
    description: `User prompt: ${prompt}\n\nTier: ${cls.tier} (${cls.reasoning})`,
    status: "in_progress",
    leadAgentId: agent.id,
    goalIds: [GOAL_ID],
    workspace: {
      name: slug,
      sourceType: "local_path",
      cwd: `${process.env.HOME}/.paperclip/instances/default/workspaces/${agent.id}`,
      visibility: "default",
      isPrimary: true,
    },
  });

  const issue = await paperclip.createIssue({
    projectId: project.id,
    goalId: GOAL_ID,
    title: `Build: ${prompt.slice(0, 80)}`,
    description: buildIssueBody({ tier: cls.tier, slug, prompt, externalApis: cls.external_apis, appwrite }),
    assigneeAgentId: agent.id,
    priority: "high",
    status: "todo",
    workMode: "standard",
  });

  // Record initial registry state.
  const app = await upsertApp(slug, {
    slug, port,
    tier: cls.tier,
    prompt,
    reasoning: cls.reasoning,
    external_apis: cls.external_apis,
    projectId: project.id,
    issueId: issue.id,
    agentId: agent.id,
    agentName: agent.name,
    appwrite, // null for Tier 1/2, populated for Tier 3
    status: "queued",
    url: null,
  });

  // Wake the agent — fire-and-forget. The watcher below will track progress.
  paperclip.wake(agent.id, { source: "on_demand", reason: `agentos build ${slug}` })
    .catch((e) => log("[build] wake error:", e.message));

  // Watcher runs in the background. When the issue hits `done`, it deploys.
  startWatcher({
    slug, issue, port, tier: cls.tier, agentId: agent.id,
    externalApis: cls.external_apis, appwrite, log,
  });

  return app;
}

const buildLogs = new Map(); // slug -> [{ts, stage, line}, ...]

export function getBuildLog(slug) {
  return buildLogs.get(slug) ?? [];
}

/**
 * On agentos-api startup, scan the registry for apps in non-terminal status
 * and restart watchers so we don't lose track of in-flight builds across
 * server restarts.
 */
export async function resumePendingWatchers(log = console.log) {
  const { listApps } = await import("./registry.js");
  const apps = await listApps();
  const pending = apps.filter((a) =>
    ["queued", "planning", "building", "verifying", "deploying"].includes(a.status)
  );
  if (pending.length === 0) {
    log(`[resume] no pending builds`);
    return;
  }
  log(`[resume] restarting watchers for ${pending.length} build(s)`);
  for (const app of pending) {
    if (!app.issueId || !app.agentId) {
      log(`[resume] ${app.slug}: missing issueId/agentId — skipping`);
      continue;
    }
    log(`[resume] ${app.slug} (issue ${app.issueId.slice(0,8)} agent ${app.agentId.slice(0,8)}) status=${app.status}`);
    startWatcher({
      slug: app.slug,
      issue: { id: app.issueId },
      port: app.port,
      tier: app.tier,
      agentId: app.agentId,
      externalApis: app.external_apis ?? [],
      appwrite: app.appwrite ?? null,
      log,
    });
  }
}

function pushLog(slug, stage, line) {
  const list = buildLogs.get(slug) ?? [];
  list.push({ ts: Date.now(), stage, line });
  if (list.length > 2000) list.splice(0, list.length - 2000);
  buildLogs.set(slug, list);
}

async function startWatcher({ slug, issue, port, tier, agentId, externalApis, appwrite, log }) {
  pushLog(slug, "build", "queued");
  const startedAt = Date.now();
  const timeoutMs = 60 * 60 * 1000; // 1h hard cap

  const loop = async () => {
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const cur = await paperclip.getIssue(issue.id);
        const active = await paperclip.activeRun(issue.id).catch(() => null);
        const status = cur?.status;
        const mappedNow =
          status === "done" ? "verifying" :
          status === "in_progress" ? "building" :
          status === "blocked" || status === "cancelled" ? "failed" :
          "queued";

        await upsertApp(slug, { status: mappedNow });
        if (active?.id) pushLog(slug, "paperclip", `run ${active.id.slice(0,8)} ${active.status}`);

        if (status === "done") {
          pushLog(slug, "build", "agent done; starting deploy");
          await upsertApp(slug, { status: "deploying" });
          try {
            const result = await deploy({
              slug, agentId, tier, port, externalApis, appwrite,
              onLog: (stage, line) => pushLog(slug, stage, line),
            });
            await upsertApp(slug, { status: result.healthy ? "completed" : "starting", url: result.url });
            pushLog(slug, "deploy", "completed: " + result.url);
          } catch (err) {
            log("[deploy] error:", err.message);
            await upsertApp(slug, { status: "failed", lastError: err.message });
            pushLog(slug, "deploy", "FAILED: " + err.message);
          }
          return;
        }

        if (status === "blocked" || status === "cancelled") {
          // Even if the agent gave up, check whether the workspace has the
          // template copied (package.json + src/app/page.tsx). If so, deploy
          // anyway — the deploy hook will do the build. Agent's job was
          // "write code", not "verify build".
          pushLog(slug, "build", `agent ${status}; checking workspace for code`);
          const fs = await import("node:fs/promises");
          const ws = `${process.env.HOME}/.paperclip/instances/default/workspaces/${agentId}`;
          const hasPkg = await fs.access(`${ws}/package.json`).then(() => true).catch(() => false);
          const hasPage = await fs.access(`${ws}/src/app/page.tsx`).then(() => true).catch(() => false);
          const hasDockerfile = await fs.access(`${ws}/Dockerfile`).then(() => true).catch(() => false);
          // Dockerfile intentionally NOT required: deploy() -> refreshDockerfile()
          // injects it from the template. Only the agent-written parts gate here.
          if (hasPkg && hasPage) {
            pushLog(slug, "build", `workspace has template + code — deploying despite agent ${status}`);
            await upsertApp(slug, { status: "deploying" });
            try {
              const result = await deploy({
                slug, agentId, tier, port, externalApis,
                onLog: (stage, line) => pushLog(slug, stage, line),
              });
              await upsertApp(slug, { status: result.healthy ? "completed" : "starting", url: result.url });
              pushLog(slug, "deploy", "fallback-completed: " + result.url);
            } catch (err) {
              pushLog(slug, "deploy", "FAILED (fallback): " + err.message);
              await upsertApp(slug, { status: "failed", lastError: `agent ${status}; deploy failed: ${err.message}` });
            }
          } else {
            pushLog(slug, "build", `no template/code in workspace (pkg=${hasPkg} page=${hasPage} docker=${hasDockerfile}) — marking failed`);
            await upsertApp(slug, { status: "failed", lastError: `agent ${status}; nothing to deploy` });
          }
          return;
        }
      } catch (e) {
        pushLog(slug, "watcher", "error: " + e.message);
      }
      await new Promise((r) => setTimeout(r, 6000));
    }
    pushLog(slug, "build", "timeout 1h");
    await upsertApp(slug, { status: "failed", lastError: "timeout 1h" });
  };

  loop().catch((e) => log("[watcher] crash:", e.stack));
}
