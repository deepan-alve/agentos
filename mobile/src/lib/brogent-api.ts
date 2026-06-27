/**
 * Brogent backend API client (transport-only).
 *
 * Talks to the Next.js Brogent gateway:
 *   - POST /api/projects                       → create a build job
 *   - GET  /api/projects/:id                   → fetch project state
 *   - GET  /api/projects/:id/stream  (SSE)     → live build event stream
 *
 * Event model on the SSE stream:
 *   - `ready`                  → first event after connect (with resume info)
 *   - `<stage>` (named)        → per-stage BuildEvent; known stages are
 *                                plan / provision / build / deploy / done /
 *                                retry / build_step / tool_call. We fan all
 *                                of these into the single `onEvent` callback.
 *   - `final`                  → terminal event with {status, app_url}; the
 *                                server closes the stream right after.
 *   - `warn`                   → transient backend hiccup; non-fatal.
 *   - `error` / `timeout`      → stream is dying; treat as terminal failure
 *                                if we never saw a `final`.
 *   - SSE `: ping` comments are filtered by react-native-sse.
 *
 * This module has NO UI / state dependencies. The caller supplies the
 * Brogent gateway URL explicitly on every call.
 */

import EventSource from 'react-native-sse';

// ---------- Public types ----------

export type BrogentEvent = {
  id: string;
  project: string;
  agent: string;
  stage: string;
  message: string;
  data: unknown;
  ts: string;
};

export type BrogentFinal = {
  status: 'done' | 'failed';
  app_url: string | null;
};

export type BrogentCreateResponse = {
  id: string;
  slug: string;
  status: string;
};

export type BuildStreamCallbacks = {
  onReady?: (payload: { project: string; status: string }) => void;
  onEvent?: (e: BrogentEvent) => void;
  onFinal: (f: BrogentFinal) => void;
  onError: (err: {
    kind: 'network' | 'server' | 'timeout';
    message: string;
  }) => void;
};

export type BuildStreamHandle = { close: () => void };

// ---------- Errors ----------

export class BrogentApiError extends Error {
  public readonly code: string | null;
  public readonly httpStatus: number | null;

  constructor(
    message: string,
    opts: { code?: string | null; httpStatus?: number | null } = {},
  ) {
    super(message);
    this.name = 'BrogentApiError';
    this.code = opts.code ?? null;
    this.httpStatus = opts.httpStatus ?? null;
  }
}

// ---------- Internal helpers ----------

const STAGE_EVENT_NAMES = [
  'plan',
  'provision',
  'build',
  'deploy',
  'done',
  'retry',
  'build_step',
  'tool_call',
] as const;

type StageEventName = (typeof STAGE_EVENT_NAMES)[number];

const CREATE_TIMEOUT_MS = 10_000;
const GET_TIMEOUT_MS = 10_000;

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function safeParseJson(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[brogent-api] failed to parse SSE payload', err);
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function coerceBuildEvent(raw: unknown, fallbackStage: string): BrogentEvent | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id : '';
  const project = typeof raw.project === 'string' ? raw.project : '';
  const agent = typeof raw.agent === 'string' ? raw.agent : '';
  const stage = typeof raw.stage === 'string' && raw.stage.length > 0 ? raw.stage : fallbackStage;
  const message = typeof raw.message === 'string' ? raw.message : '';
  const ts = typeof raw.ts === 'string' ? raw.ts : '';
  // `data` is intentionally `unknown`; pass through whatever the server sent
  // (could be null, object, array, primitive).
  const data: unknown = 'data' in raw ? raw.data : null;
  return { id, project, agent, stage, message, data, ts };
}

function coerceFinal(raw: unknown): BrogentFinal {
  if (isRecord(raw)) {
    const status = raw.status === 'done' ? 'done' : 'failed';
    const appUrl = typeof raw.app_url === 'string' ? raw.app_url : null;
    return { status, app_url: appUrl };
  }
  return { status: 'failed', app_url: null };
}

// react-native-sse types the per-event payload loosely; we narrow at the call
// site. This local type captures the shape we actually read.
type SseMessageLike = { data?: string | null | undefined } | undefined;

// ---------- createBuild ----------

export async function createBuild(input: {
  brogentUrl: string;
  prompt: string;
  handle: string;
}): Promise<BrogentCreateResponse> {
  const base = trimTrailingSlash(input.brogentUrl);
  const url = `${base}/api/projects`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: input.prompt, handle: input.handle }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted =
      err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message));
    throw new BrogentApiError(
      aborted ? 'createBuild timed out' : `createBuild network error: ${(err as Error).message}`,
      { code: aborted ? 'timeout' : 'network', httpStatus: null },
    );
  } finally {
    clearTimeout(timer);
  }

  let bodyJson: unknown = null;
  try {
    bodyJson = await res.json();
  } catch {
    bodyJson = null;
  }

  if (res.status !== 201) {
    const errMsg =
      isRecord(bodyJson) && typeof bodyJson.error === 'string'
        ? bodyJson.error
        : `createBuild failed with status ${res.status}`;
    const code =
      isRecord(bodyJson) && typeof bodyJson.code === 'string' ? bodyJson.code : null;
    throw new BrogentApiError(errMsg, { code, httpStatus: res.status });
  }

  if (
    !isRecord(bodyJson) ||
    typeof bodyJson.id !== 'string' ||
    typeof bodyJson.slug !== 'string' ||
    typeof bodyJson.status !== 'string'
  ) {
    throw new BrogentApiError('createBuild: malformed 201 response', {
      code: 'bad_response',
      httpStatus: res.status,
    });
  }

  return { id: bodyJson.id, slug: bodyJson.slug, status: bodyJson.status };
}

// ---------- getProject ----------

export async function getProject(input: {
  brogentUrl: string;
  projectId: string;
}): Promise<{
  id: string;
  slug: string;
  status: string;
  app_url: string | null;
  error?: string;
}> {
  const base = trimTrailingSlash(input.brogentUrl);
  const url = `${base}/api/projects/${encodeURIComponent(input.projectId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    const aborted =
      err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message));
    throw new BrogentApiError(
      aborted ? 'getProject timed out' : `getProject network error: ${(err as Error).message}`,
      { code: aborted ? 'timeout' : 'network', httpStatus: null },
    );
  } finally {
    clearTimeout(timer);
  }

  let bodyJson: unknown = null;
  try {
    bodyJson = await res.json();
  } catch {
    bodyJson = null;
  }

  if (!res.ok) {
    const errMsg =
      isRecord(bodyJson) && typeof bodyJson.error === 'string'
        ? bodyJson.error
        : `getProject failed with status ${res.status}`;
    const code =
      isRecord(bodyJson) && typeof bodyJson.code === 'string' ? bodyJson.code : null;
    throw new BrogentApiError(errMsg, { code, httpStatus: res.status });
  }

  if (!isRecord(bodyJson)) {
    throw new BrogentApiError('getProject: malformed response', {
      code: 'bad_response',
      httpStatus: res.status,
    });
  }

  const id = typeof bodyJson.id === 'string' ? bodyJson.id : input.projectId;
  const slug = typeof bodyJson.slug === 'string' ? bodyJson.slug : '';
  const status = typeof bodyJson.status === 'string' ? bodyJson.status : 'unknown';
  const appUrl = typeof bodyJson.app_url === 'string' ? bodyJson.app_url : null;
  const errStr = typeof bodyJson.error === 'string' ? bodyJson.error : undefined;

  return errStr !== undefined
    ? { id, slug, status, app_url: appUrl, error: errStr }
    : { id, slug, status, app_url: appUrl };
}

// ---------- subscribeBuildStream ----------

export function subscribeBuildStream(input: {
  brogentUrl: string;
  projectId: string;
  lastEventId?: string;
  callbacks: BuildStreamCallbacks;
}): BuildStreamHandle {
  const base = trimTrailingSlash(input.brogentUrl);
  const url = `${base}/api/projects/${encodeURIComponent(input.projectId)}/stream`;
  const { callbacks } = input;

  const headers: Record<string, string> = {};
  if (input.lastEventId && input.lastEventId.length > 0) {
    headers['Last-Event-ID'] = input.lastEventId;
  }

  // `react-native-sse` is generic over its event name union. We feed it the
  // union of names we explicitly listen for so the listener callbacks are
  // typed correctly.
  type SseName =
    | 'ready'
    | 'final'
    | 'warn'
    | 'error'
    | 'timeout'
    | StageEventName;

  // The library types are imperfect across versions; cast through unknown so
  // we don't have to depend on whichever option-shape the installed version
  // ships. Behaviour requested: disable built-in reconnect.
  const es = new (EventSource as unknown as {
    new (url: string, opts: unknown): {
      addEventListener: (name: string, cb: (ev: SseMessageLike) => void) => void;
      removeAllEventListeners?: () => void;
      close: () => void;
    };
  })(url, {
    headers,
    pollingInterval: 0,
  });

  let closed = false;
  let finalSeen = false;

  const listeners: { name: SseName; cb: (ev: SseMessageLike) => void }[] = [];

  const attach = (name: SseName, cb: (ev: SseMessageLike) => void): void => {
    listeners.push({ name, cb });
    es.addEventListener(name, cb);
  };

  const closeStream = (): void => {
    if (closed) return;
    closed = true;
    // Best-effort listener cleanup. `react-native-sse` does not expose a
    // public `removeEventListener` consistently, but `removeAllEventListeners`
    // is available on recent versions; fall back to `close()` which the
    // library uses to tear everything down internally.
    try {
      if (typeof es.removeAllEventListeners === 'function') {
        es.removeAllEventListeners();
      }
    } catch {
      // ignore
    }
    try {
      es.close();
    } catch {
      // ignore
    }
    // Drop our refs so the GC can collect closures.
    listeners.length = 0;
  };

  const fireFinal = (f: BrogentFinal): void => {
    if (finalSeen) return;
    finalSeen = true;
    try {
      callbacks.onFinal(f);
    } finally {
      closeStream();
    }
  };

  // ----- ready -----
  attach('ready', (ev) => {
    const parsed = safeParseJson(ev?.data);
    if (callbacks.onReady && isRecord(parsed)) {
      const project = typeof parsed.project === 'string' ? parsed.project : input.projectId;
      const status = typeof parsed.status === 'string' ? parsed.status : 'unknown';
      callbacks.onReady({ project, status });
    }
  });

  // ----- known stage events → onEvent -----
  for (const stage of STAGE_EVENT_NAMES) {
    attach(stage, (ev) => {
      const parsed = safeParseJson(ev?.data);
      const built = coerceBuildEvent(parsed, stage);
      if (built && callbacks.onEvent) callbacks.onEvent(built);
    });
  }

  // ----- final -----
  attach('final', (ev) => {
    const parsed = safeParseJson(ev?.data);
    fireFinal(coerceFinal(parsed));
  });

  // ----- warn (non-fatal) -----
  attach('warn', (ev) => {
    const parsed = safeParseJson(ev?.data);
    const msg =
      isRecord(parsed) && typeof parsed.error === 'string'
        ? parsed.error
        : 'transient backend warning';
    callbacks.onError({ kind: 'server', message: msg });
  });

  // ----- timeout (terminal) -----
  attach('timeout', (ev) => {
    const parsed = safeParseJson(ev?.data);
    const reason =
      isRecord(parsed) && typeof parsed.reason === 'string'
        ? parsed.reason
        : 'build stream timed out';
    callbacks.onError({ kind: 'timeout', message: reason });
    fireFinal({ status: 'failed', app_url: null });
  });

  // ----- error (could be transport or server-sent named `error`) -----
  attach('error', (ev) => {
    // The library fires a synthetic 'error' event on transport problems with
    // no `data`. Server-sent `error` events do carry JSON `{error: string}`.
    const parsed = safeParseJson(ev?.data);
    let message = 'stream error';
    let kind: 'network' | 'server' = 'network';
    if (isRecord(parsed) && typeof parsed.error === 'string') {
      message = parsed.error;
      kind = 'server';
    } else if (
      ev &&
      typeof (ev as { message?: unknown }).message === 'string'
    ) {
      message = (ev as { message: string }).message;
    }
    callbacks.onError({ kind, message });
    // Only synthesise a terminal failure if the server never sent `final`.
    fireFinal({ status: 'failed', app_url: null });
  });

  return {
    close: closeStream,
  };
}
