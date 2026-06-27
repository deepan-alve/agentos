// Mock multi-agent build pipeline for the demo.
// Simulates Brogent's pipeline: plan_app → build → semantic → visual → functional → done.
// Designed to NEVER fully complete by default — emits a long scripted phase
// (~70s) then enters an infinite "polishing" loop so the reviewer sees the
// agent grinding through real-feeling work. Cancel via AbortSignal.

export type Agent =
  | 'orchestrator'
  | 'planner'
  | 'builder'
  | 'reviewer-semantic'
  | 'reviewer-visual'
  | 'reviewer-functional';

export type Stage =
  | 'planning'
  | 'building'
  | 'semantic'
  | 'visual'
  | 'functional'
  | 'retry'
  | 'polishing'
  | 'done';

export type BuildEvent = {
  agent: Agent;
  message: string;
  ts: number;
  stage: Stage;
};

export type BuildResult = {
  appId: string;
  name: string;
  url: string;
  score: number;
};

export type BuildUpdate =
  | { type: 'event'; event: BuildEvent }
  | { type: 'progress'; pct: number; stage: Stage }
  | { type: 'done'; result: BuildResult }
  | { type: 'failed'; reason: string };

const DEMO_APPS: { keywords: RegExp; name: string; url: string }[] = [
  {
    keywords: /\b(todo|task|todolist|to-do|tasks?)\b/i,
    name: 'Tasks',
    url: 'https://deepan-alve.github.io/agentos-appstore/apps/todo/',
  },
  {
    keywords: /\b(calc|calculator|math|arithmetic|numbers?)\b/i,
    name: 'Calc',
    url: 'https://deepan-alve.github.io/agentos-appstore/apps/calculator/',
  },
  {
    keywords: /\b(tic[ -]?tac[ -]?toe|xo|noughts|game|3x3|3 by 3)\b/i,
    name: 'Tic Tac Toe',
    url: 'https://deepan-alve.github.io/agentos-appstore/apps/tictactoe/',
  },
];

function pickResultForPrompt(prompt: string): { name: string; url: string } {
  for (const candidate of DEMO_APPS) {
    if (candidate.keywords.test(prompt)) {
      return { name: candidate.name, url: candidate.url };
    }
  }
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) | 0;
  const choice = DEMO_APPS[Math.abs(h) % DEMO_APPS.length];
  return { name: choice.name, url: choice.url };
}

function nameFromPrompt(prompt: string, fallback: string): string {
  const stripped = prompt.replace(/^(a|an|the|build|make|create|generate|me)\s+/gi, '');
  const word = stripped.split(/[\s,]+/).slice(0, 2).join(' ').trim();
  if (!word) return fallback;
  return (
    word
      .replace(/[^\w\s-]/g, '')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 24) || fallback
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }
  });
}

function jitter(base: number, variance: number): number {
  return base + Math.floor(Math.random() * variance);
}

type ScriptStep = {
  stage: Stage;
  agent: Agent;
  message: string;
  delay: number; // ms before this step fires
  progressTo: number; // cumulative progress 0-100 after this step (capped at 92 during retries)
};

function makeScript(prompt: string, name: string): ScriptStep[] {
  const lower = prompt.toLowerCase();
  const tier = /\b(api|key|integrat|fetch|weather|news|chatgpt|claude)\b/.test(lower)
    ? 'api-integrating'
    : /\b(save|stateful|persist|account|login|database|baas|backend)\b/.test(lower)
    ? 'full-baas'
    : 'stateless';
  const promptSnippet = prompt.slice(0, 64) + (prompt.length > 64 ? '…' : '');

  return [
    // PLANNING — ~6s
    { stage: 'planning', agent: 'orchestrator', message: 'New build accepted. Routing to planner.', delay: 900, progressTo: 4 },
    { stage: 'planning', agent: 'planner', message: `Parsing prompt — "${promptSnippet}"`, delay: 1400, progressTo: 8 },
    { stage: 'planning', agent: 'planner', message: `Classifying tier · ${tier}`, delay: 1000, progressTo: 11 },
    { stage: 'planning', agent: 'planner', message: 'Drafting verificationChecklist (mobile-first, accessibility, persistence)', delay: 1400, progressTo: 14 },
    { stage: 'planning', agent: 'planner', message: 'Plan locked · 1 page · 4 components · 1 collection (if stateful)', delay: 1100, progressTo: 17 },

    // BUILDING v1 — ~15s
    { stage: 'building', agent: 'orchestrator', message: 'Plan approved. Spawning builder.', delay: 700, progressTo: 19 },
    { stage: 'building', agent: 'builder', message: 'write_file · index.html (viewport, theme-color, fonts)', delay: 1800, progressTo: 24 },
    { stage: 'building', agent: 'builder', message: 'write_file · styles inline · CSS variables, dark theme', delay: 2200, progressTo: 30 },
    { stage: 'building', agent: 'builder', message: `write_file · app logic for "${name}"`, delay: 2600, progressTo: 36 },
    { stage: 'building', agent: 'builder', message: 'Wiring event handlers · 4 handlers, 0 duplicates', delay: 1500, progressTo: 40 },
    { stage: 'building', agent: 'builder', message: 'Persistence layer · localStorage scoped to origin', delay: 1400, progressTo: 44 },
    { stage: 'building', agent: 'builder', message: 'done() called · v1 ready for review', delay: 1100, progressTo: 47 },

    // STATIC CHECK — ~3s
    { stage: 'semantic', agent: 'reviewer-semantic', message: 'Static analysis · DOM IDs, query alignment, schema refs', delay: 1700, progressTo: 53 },
    { stage: 'semantic', agent: 'reviewer-semantic', message: 'Pass · 0 errors, 0 warnings', delay: 900, progressTo: 56 },

    // VISUAL REVIEW v1 — ~5s — FAILS
    { stage: 'visual', agent: 'reviewer-visual', message: 'Capturing screenshots at 393×852, 412×915', delay: 2100, progressTo: 62 },
    { stage: 'visual', agent: 'reviewer-visual', message: 'Scoring contrast, hierarchy, mobile fit', delay: 1700, progressTo: 65 },
    { stage: 'visual', agent: 'reviewer-visual', message: 'Visual score · 7.1 / 10 — below threshold', delay: 1000, progressTo: 67 },
    { stage: 'visual', agent: 'reviewer-visual', message: 'Issues · hero CTA contrast 3.8:1 (needs 4.5:1), spacing inconsistency', delay: 1300, progressTo: 69 },

    // RETRY — ~12s
    { stage: 'retry', agent: 'orchestrator', message: 'Classifier · low score, attempt 2 of 3', delay: 900, progressTo: 71 },
    { stage: 'retry', agent: 'orchestrator', message: 'Locking focus area · CTA + spacing tokens', delay: 1000, progressTo: 73 },
    { stage: 'retry', agent: 'orchestrator', message: 'Recording build learning · ENFORCE_CONTRAST_BEFORE_REVIEW', delay: 900, progressTo: 74 },
    { stage: 'building', agent: 'builder', message: 'write_file · styles.css — contrast tokens hardened', delay: 2200, progressTo: 78 },
    { stage: 'building', agent: 'builder', message: 'write_file · index.html — spacing scale normalized', delay: 2400, progressTo: 81 },
    { stage: 'building', agent: 'builder', message: 'done() called · v2 ready for review', delay: 1200, progressTo: 83 },
    { stage: 'visual', agent: 'reviewer-visual', message: 'Re-capturing screenshots · 393×852, 412×915, 360×800', delay: 1900, progressTo: 86 },
    { stage: 'visual', agent: 'reviewer-visual', message: 'Visual score · 8.7 / 10 — pass', delay: 1100, progressTo: 88 },

    // FUNCTIONAL REVIEW — ~6s
    { stage: 'functional', agent: 'reviewer-functional', message: 'Driving primary user flow with Playwright', delay: 2400, progressTo: 91 },
    { stage: 'functional', agent: 'reviewer-functional', message: 'Testing interactive elements · 4/4 respond correctly', delay: 1600, progressTo: 92 },
  ];
}

// Once the scripted phase ends, the agent enters a "still polishing" loop
// that emits one realistic-sounding message every 8-15s. Progress bar holds
// at 92% — looks like the agent is grinding for the last few %.
const POLISHING_POOL: { agent: Agent; message: string }[] = [
  { agent: 'reviewer-visual', message: 'Verifying contrast across 6 color combinations' },
  { agent: 'reviewer-functional', message: 'Replaying user flow at 1.5× and 0.5× tap speed' },
  { agent: 'reviewer-semantic', message: 'Cross-referencing event handlers with rendered IDs' },
  { agent: 'orchestrator', message: 'Cost check · 2,310 tokens · within budget' },
  { agent: 'reviewer-visual', message: 'Re-rendering with safe-area inset · top 48px, bottom 34px' },
  { agent: 'builder', message: 'Hardening localStorage key · agentos-tasks-v1' },
  { agent: 'reviewer-functional', message: 'Edge case · empty state renders correctly' },
  { agent: 'reviewer-functional', message: 'Edge case · 100 items, scroll performance OK' },
  { agent: 'reviewer-visual', message: 'Checking font fallback when Google Fonts is slow' },
  { agent: 'orchestrator', message: 'Heartbeat · worker alive, attempt 3 of 3' },
  { agent: 'reviewer-semantic', message: 'Validating sanitization on all user-input fields' },
  { agent: 'reviewer-visual', message: 'Diffing v2 vs v1 — improvement delta +1.6' },
  { agent: 'reviewer-functional', message: 'Testing keyboard navigation order' },
  { agent: 'builder', message: 'Tightening CSS — removing 4 unused selectors' },
  { agent: 'reviewer-visual', message: 'Re-scoring after polish · 9.0 / 10 reached' },
  { agent: 'orchestrator', message: 'Convergence check · score stable across 2 attempts' },
  { agent: 'reviewer-functional', message: 'Persistence flow · reload survives, force-quit survives' },
  { agent: 'reviewer-visual', message: 'Visual review still tuning — one more pass' },
  { agent: 'builder', message: 'No file changes needed, v2 is final' },
  { agent: 'orchestrator', message: 'Holding for final approval signal' },
];

export async function* buildApp(req: {
  prompt: string;
  submittedBy: string;
  signal?: AbortSignal;
}): AsyncGenerator<BuildUpdate> {
  const picked = pickResultForPrompt(req.prompt);
  const name = nameFromPrompt(req.prompt, picked.name);
  const script = makeScript(req.prompt, name);

  try {
    // Scripted phase ~70 seconds
    for (const step of script) {
      if (req.signal?.aborted) return;
      await sleep(jitter(step.delay, Math.floor(step.delay * 0.2)), req.signal);
      yield {
        type: 'event',
        event: {
          agent: step.agent,
          message: step.message,
          ts: Date.now(),
          stage: step.stage,
        },
      };
      yield { type: 'progress', pct: step.progressTo, stage: step.stage };
    }

    // Indefinite polishing phase — never completes by design.
    // Progress holds at 92%; agent log streams one new line every ~10s.
    let cursor = 0;
    while (!req.signal?.aborted) {
      await sleep(jitter(9000, 6000), req.signal);
      const entry = POLISHING_POOL[cursor % POLISHING_POOL.length];
      cursor++;
      yield {
        type: 'event',
        event: {
          agent: entry.agent,
          message: entry.message,
          ts: Date.now(),
          stage: 'polishing',
        },
      };
      yield { type: 'progress', pct: 92, stage: 'polishing' };
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return;
    throw e;
  }
}

export function stageLabel(stage: Stage): string {
  return ({
    planning: 'PLANNING',
    building: 'BUILDING',
    semantic: 'STATIC CHECK',
    visual: 'VISUAL REVIEW',
    functional: 'FUNCTIONAL REVIEW',
    retry: 'ITERATING',
    polishing: 'POLISHING',
    done: 'DONE',
  } as const)[stage];
}

export function agentColor(agent: Agent): string {
  return ({
    orchestrator: '#EAE4D8',
    planner: '#FFB54C',
    builder: '#5AC8FA',
    'reviewer-semantic': '#C28FFF',
    'reviewer-visual': '#7CE7C7',
    'reviewer-functional': '#FF7A4D',
  } as const)[agent];
}

export function agentLabel(agent: Agent): string {
  return ({
    orchestrator: 'ORCHESTRATOR',
    planner: 'PLANNER',
    builder: 'BUILDER',
    'reviewer-semantic': 'STATIC',
    'reviewer-visual': 'VISUAL',
    'reviewer-functional': 'FUNCTIONAL',
  } as const)[agent];
}
