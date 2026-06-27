// Programmatic admin client for Appwrite. Logs in as the AgentOS admin via the
// internal "console" project, then creates per-app projects + server API keys.

import fs from "node:fs/promises";

import os from "node:os";
import path from "node:path";
const CREDS_PATH = process.env.APPWRITE_CREDS_PATH ?? path.join(os.homedir(), ".agentos", "appwrite-creds.json");

let _cookieJar = ""; // raw Cookie header
let _cookieExpiresAt = 0;
let _creds = null;

async function loadCreds() {
  if (_creds) return _creds;
  const buf = await fs.readFile(CREDS_PATH, "utf8");
  _creds = JSON.parse(buf);
  return _creds;
}

async function adminCall(method, path, body, projectHeader = "console") {
  const creds = await loadCreds();
  if (!_cookieJar || Date.now() >= _cookieExpiresAt) await loginAdmin();
  const res = await fetch(creds.endpoint + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectHeader,
      "Cookie": _cookieJar,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`appwrite ${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

async function loginAdmin() {
  const creds = await loadCreds();
  const res = await fetch(creds.endpoint + "/account/sessions/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": "console",
    },
    body: JSON.stringify({ email: creds.admin_email, password: creds.admin_password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`appwrite admin login failed: ${res.status} ${text.slice(0, 300)}`);
  }
  // Capture the Set-Cookie headers — Appwrite sets `a_session_console_legacy` etc.
  const setCookies = res.headers.getSetCookie?.() ?? res.headers.raw?.()["set-cookie"] ?? [];
  if (setCookies.length === 0) {
    // Fall back to single header.
    const single = res.headers.get("set-cookie");
    if (!single) throw new Error("appwrite admin login: no session cookie returned");
    _cookieJar = single.split(";")[0];
  } else {
    _cookieJar = setCookies.map((c) => c.split(";")[0]).join("; ");
  }
  // Session is good for ~1 year; refresh after 23h to be safe.
  _cookieExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
}

/**
 * Create a new Appwrite project + a server API key + the `main` database
 * for it. Returns the env vars to inject into the per-app container.
 */
export async function createAppwriteProject(slug) {
  const creds = await loadCreds();
  const sanitized = slug.replace(/[^a-z0-9-]/g, "-").slice(0, 36);

  const project = await adminCall("POST", "/projects", {
    projectId: "unique()",
    name: sanitized,
    teamId: creds.team_id,
    region: "default",
  });
  const projectId = project.$id;

  // Register web platforms so the browser-side SDK can talk to Appwrite from
  // these origins without CORS rejection. Cover both LAN IP and localhost.
  const PLATFORMS = [
    { name: "AgentOS LAN", key: "192.168.1.37", hostname: "192.168.1.37" },
    { name: "localhost",    key: "localhost",     hostname: "localhost" },
  ];
  for (const p of PLATFORMS) {
    await adminCall("POST", `/projects/${projectId}/platforms`, {
      type: "web", ...p,
    }).catch((e) => console.error(`[appwrite] add platform ${p.hostname} failed:`, e.message));
  }

  const key = await adminCall("POST", `/projects/${projectId}/keys`, {
    name: "server-key",
    scopes: [
      "users.read", "users.write",
      "teams.read", "teams.write",
      "databases.read", "databases.write",
      "collections.read", "collections.write",
      "attributes.read", "attributes.write",
      "indexes.read", "indexes.write",
      "documents.read", "documents.write",
      "files.read", "files.write",
      "functions.read", "functions.write",
      "execution.read", "execution.write",
      "rules.read", "rules.write",
      "sessions.write", "locale.read", "health.read",
    ],
  });

  // Create the `main` database within the new project. Use the project's API
  // key for this call (scoped to that project only).
  await fetch(creds.endpoint + "/databases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": key.secret,
    },
    body: JSON.stringify({ databaseId: "main", name: "main" }),
  }).then(async (r) => {
    if (!r.ok) {
      const t = await r.text();
      if (!t.includes("already exists")) throw new Error("create db failed: " + t.slice(0, 200));
    }
  });

  return {
    projectId,
    apiKey: key.secret,
    databaseId: "main",
    endpoint: creds.lan_endpoint, // what containers + browsers hit
  };
}
