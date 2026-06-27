import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const ADJECTIVES = [
  'amber',
  'velvet',
  'iron',
  'silent',
  'wild',
  'nimble',
  'crimson',
  'silver',
  'midnight',
  'cobalt',
  'paper',
  'glass',
  'feral',
  'gentle',
  'lunar',
  'opal',
  'ember',
  'frost',
  'slate',
  'ochre',
  'sable',
  'plum',
  'jade',
  'rust',
  'ivory',
  'mauve',
  'salt',
  'storm',
  'dune',
  'quiet',
];

const NOUNS = [
  'otter',
  'lynx',
  'falcon',
  'orchid',
  'comet',
  'fern',
  'finch',
  'bramble',
  'heron',
  'meridian',
  'kestrel',
  'lichen',
  'monolith',
  'plover',
  'sable',
  'sundial',
  'thistle',
  'tundra',
  'vellum',
  'wren',
  'yarrow',
  'zenith',
  'cinder',
  'glyph',
  'harbor',
  'isle',
  'juniper',
  'lattice',
  'marrow',
  'nebula',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateHandle(): string {
  const a = pick(ADJECTIVES);
  const n = pick(NOUNS);
  const num = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${a}-${n}-${num}`;
}

type IdentityState = {
  handle: string;
  hydrated: boolean;
  ensureHandle: () => string;
};

export const useIdentity = create<IdentityState>()(
  persist(
    (set, get) => ({
      handle: '',
      hydrated: false,
      ensureHandle: () => {
        const current = get().handle;
        if (current) return current;
        const fresh = generateHandle();
        set({ handle: fresh });
        return fresh;
      },
    }),
    {
      name: 'agentos-identity-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ handle: s.handle }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (!state.handle) {
          state.handle = generateHandle();
        }
      },
    },
  ),
);
