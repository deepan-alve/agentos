// Simple JSON-file registry at ~/.agentos/registry.json
// Schema:
// {
//   "nextPort": 5001,
//   "apps": {
//     "<slug>": {
//       slug, projectId, issueId, agentId, tier, prompt,
//       port, url, status, createdAt, updatedAt, lastError?
//     }
//   }
// }

import fs from "node:fs/promises";
import { REGISTRY_PATH, PORT_RANGE } from "../config.js";

let lockChain = Promise.resolve();

async function readRaw() {
  try {
    const buf = await fs.readFile(REGISTRY_PATH, "utf8");
    return JSON.parse(buf);
  } catch (e) {
    if (e.code === "ENOENT") return { nextPort: PORT_RANGE.min, apps: {} };
    throw e;
  }
}

async function writeRaw(reg) {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(reg, null, 2));
}

/** Serialize all mutations so concurrent /api/projects calls don't clobber. */
async function withLock(fn) {
  const prev = lockChain;
  let release;
  lockChain = new Promise((r) => (release = r));
  await prev;
  try {
    const reg = await readRaw();
    const result = await fn(reg);
    await writeRaw(reg);
    return result;
  } finally {
    release();
  }
}

export async function allocatePort() {
  return withLock(async (reg) => {
    const used = new Set(Object.values(reg.apps).map((a) => a.port).filter(Boolean));
    let p = reg.nextPort;
    while (used.has(p) && p < PORT_RANGE.max) p++;
    if (p > PORT_RANGE.max) throw new Error("port range exhausted");
    reg.nextPort = p + 1;
    return p;
  });
}

export async function listApps() {
  const reg = await readRaw();
  return Object.values(reg.apps);
}

export async function getApp(slug) {
  const reg = await readRaw();
  return reg.apps[slug] ?? null;
}

export async function upsertApp(slug, patch) {
  return withLock(async (reg) => {
    const prev = reg.apps[slug] ?? {};
    reg.apps[slug] = { ...prev, ...patch, slug, updatedAt: new Date().toISOString() };
    if (!prev.createdAt) reg.apps[slug].createdAt = reg.apps[slug].updatedAt;
    return reg.apps[slug];
  });
}

export async function deleteApp(slug) {
  return withLock(async (reg) => {
    delete reg.apps[slug];
    return true;
  });
}
