// Round-robin Vela dispatch with a tiny "least-busy" heuristic on top.
// Tracks how many active issues each Vela has; picks the lowest, breaks
// ties by oldest-used.

import { VELA_POOL, HELIX_POOL } from "../config.js";
import { paperclip } from "./paperclip.js";

const lastUsedAt = new Map();

/**
 * Pick the next Vela. Counts active (todo/in_progress) issues assigned to
 * each Vela, picks the one with the fewest. Ties go to oldest-used.
 */
export async function pickVela() {
  const counts = await Promise.all(VELA_POOL.map(async (v) => {
    // Fast count: list company issues filtered by assignee. There's no
    // dedicated endpoint, so we list and filter client-side. Fine at this scale.
    const issues = await paperclip.raw.call("GET", `/companies/${v.id ? "f64c3449-6adf-4f3c-800b-39f27f36772b" : ""}/issues`).catch(() => []);
    const active = (issues ?? []).filter(
      (i) => i.assigneeAgentId === v.id && ["todo", "in_progress"].includes(i.status),
    ).length;
    return { vela: v, active };
  }));
  counts.sort((a, b) => {
    if (a.active !== b.active) return a.active - b.active;
    return (lastUsedAt.get(a.vela.id) ?? 0) - (lastUsedAt.get(b.vela.id) ?? 0);
  });
  const pick = counts[0].vela;
  lastUsedAt.set(pick.id, Date.now());
  return { ...pick, currentLoad: counts[0].active };
}

/** Same idea but for Helix (Tier 3 Appwrite specialist). */
export async function pickHelix() {
  const counts = await Promise.all(HELIX_POOL.map(async (v) => {
    const issues = await paperclip.raw.call(
      "GET",
      `/companies/f64c3449-6adf-4f3c-800b-39f27f36772b/issues`,
    ).catch(() => []);
    const active = (issues ?? []).filter(
      (i) => i.assigneeAgentId === v.id && ["todo", "in_progress"].includes(i.status),
    ).length;
    return { vela: v, active };
  }));
  counts.sort((a, b) => {
    if (a.active !== b.active) return a.active - b.active;
    return (lastUsedAt.get(a.vela.id) ?? 0) - (lastUsedAt.get(b.vela.id) ?? 0);
  });
  const pick = counts[0].vela;
  lastUsedAt.set(pick.id, Date.now());
  return { ...pick, currentLoad: counts[0].active };
}
