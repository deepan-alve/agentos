// Thin wrapper around Paperclip's REST API.
import { PAPERCLIP_BASE, COMPANY_ID } from "../config.js";

async function call(method, path, body) {
  const res = await fetch(PAPERCLIP_BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`paperclip ${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

export const paperclip = {
  createProject: (body) => call("POST", `/companies/${COMPANY_ID}/projects`, body),
  createIssue:   (body) => call("POST", `/companies/${COMPANY_ID}/issues`,   body),
  getIssue:      (id)   => call("GET",  `/issues/${id}`),
  activeRun:     (id)   => call("GET",  `/issues/${id}/active-run`),
  liveRuns:      (id)   => call("GET",  `/issues/${id}/live-runs`),
  getRun:        (id)   => call("GET",  `/heartbeat-runs/${id}`),
  cancelRun:     (id)   => call("POST", `/heartbeat-runs/${id}/cancel`),
  wake:          (agentId, body) => call("POST", `/agents/${agentId}/wakeup`, body),
  // Raw transport for endpoints not wrapped yet (e.g. SSE log streams).
  raw: { call, base: PAPERCLIP_BASE },
};

/**
 * Map Paperclip's issue status to the phone-facing Brogent-shaped enum.
 * - todo                          -> "queued"
 * - in_progress  +  no run yet    -> "planning"
 * - in_progress  +  active run    -> "building"
 * - in_review                     -> "verifying"
 * - done                          -> "completed"
 * - blocked / cancelled           -> "failed"
 */
export function mapStatus(issue, hasActiveRun) {
  switch (issue?.status) {
    case "todo":         return "queued";
    case "in_progress":  return hasActiveRun ? "building" : "planning";
    case "in_review":    return "verifying";
    case "done":         return "completed";
    case "blocked":
    case "cancelled":    return "failed";
    default:             return "queued";
  }
}
