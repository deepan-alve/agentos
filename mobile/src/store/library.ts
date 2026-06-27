import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CatalogApp } from '@/src/data/catalog';

type LibraryState = {
  installed: CatalogApp[];
  hydrated: boolean;
  install: (app: CatalogApp) => void;
  uninstall: (id: string) => void;
  isInstalled: (id: string) => boolean;
  getInstalled: (id: string) => CatalogApp | undefined;
};

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      installed: [],
      hydrated: false,
      install: (app) =>
        set((s) =>
          s.installed.some((x) => x.id === app.id)
            ? s
            : { installed: [...s.installed, app] },
        ),
      uninstall: (id) =>
        set((s) => ({ installed: s.installed.filter((x) => x.id !== id) })),
      isInstalled: (id) => get().installed.some((x) => x.id === id),
      getInstalled: (id) => get().installed.find((x) => x.id === id),
    }),
    {
      name: 'agentos-library-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ installed: s.installed }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
