// Magic-phrase detection for the demo recording.
// Lenient keyword match. When matched, the build auto-completes after a
// per-app delay via the persistent ticker in _layout.tsx.

export type MagicHit = {
  id: string;
  name: string;
  url: string;
  delayMs: number;
};

export function matchMagic(prompt: string): MagicHit | null {
  const p = prompt.toLowerCase();
  if (/\b(tic[ -]?tac[ -]?toe)\b/.test(p)) {
    return {
      id: 'demo-tictactoe',
      name: 'Tic Tac Toe',
      url: 'https://deepan-alve.github.io/agentos-appstore/apps/demo-tictactoe/',
      delayMs: 13000 + Math.floor(Math.random() * 4000), // 13-17s
    };
  }
  if (/\b(calculator|calc)\b/.test(p)) {
    return {
      id: 'demo-calculator',
      name: 'Calc',
      url: 'https://deepan-alve.github.io/agentos-appstore/apps/demo-calculator/',
      delayMs: 7000 + Math.floor(Math.random() * 3000), // 7-10s
    };
  }
  if (/\b(todo|to-do|tasks?)\b/.test(p)) {
    return {
      id: 'demo-todo',
      name: 'Tasks',
      url: 'https://deepan-alve.github.io/agentos-appstore/apps/demo-todo/',
      delayMs: 60000 + Math.floor(Math.random() * 20000), // 60-80s
    };
  }
  return null;
}
