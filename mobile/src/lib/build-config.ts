import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const FALLBACK_URL = 'http://192.168.1.37:3001';

function readEnvUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BROGENT_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return FALLBACK_URL;
}

const INITIAL_URL = readEnvUrl();

type BuildConfigState = {
  brogentUrl: string;
  hydrated: boolean;
  setBrogentUrl: (url: string) => void;
  reset: () => void;
};

export const useBuildConfig = create<BuildConfigState>()(
  persist(
    (set) => ({
      brogentUrl: INITIAL_URL,
      hydrated: false,
      setBrogentUrl: (url: string) => {
        const trimmed = url.trim().replace(/\/+$/, '');
        set({ brogentUrl: trimmed });
      },
      reset: () => {
        set({ brogentUrl: INITIAL_URL });
      },
    }),
    {
      name: 'build-config',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ brogentUrl: s.brogentUrl }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        if (!state.brogentUrl) {
          state.brogentUrl = INITIAL_URL;
        }
      },
    },
  ),
);

// Helper for non-React code (e.g. the API client). Reads the current value
// straight from the store.
export function getBrogentUrl(): string {
  return useBuildConfig.getState().brogentUrl;
}

// Validates a user-entered URL. Returns null if valid, otherwise an error
// message suitable for inline display.
export function validateBrogentUrl(input: string): string | null {
  const value = input.trim();
  if (value.length === 0) {
    return 'URL is required';
  }
  if (value.endsWith('/')) {
    return 'No trailing slash';
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'Not a valid URL';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Must be http:// or https://';
  }
  if (!parsed.hostname) {
    return 'Missing host';
  }
  return null;
}
