import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SubmissionStatus =
  | 'not_submitted'
  | 'submitting'
  | 'queued_review'
  | 'approved_pending_merge'
  | 'live'
  | 'rejected';

export type BuildStatus = 'building' | 'built' | 'failed';

export type CreatedApp = {
  /** Brogent project id (15-char PB record id). Canonical across mobile + backend. */
  id: string;
  /** Brogent slug — also the URL path segment (`/p/<slug>`). */
  brogentSlug?: string;
  name: string;
  prompt: string;
  url: string;
  createdAt: number;
  buildStatus: BuildStatus;
  buildStartedAt: number;
  builtAt?: number;
  /** When buildStatus === 'failed', a short user-facing reason. */
  error?: string;
  /** Most recent Brogent SSE event id for resumable streaming. */
  lastEventId?: string;
  /** Latest stage emitted by Brogent (plan|provision|build|deploy|...). */
  lastStage?: string;
  /** Latest agent log line — shown in BuildingScreen as a progress signal. */
  lastMessage?: string;
  /** ms timestamp for auto-complete ticker (magic-prompt demo — disabled in real-backend mode). */
  autoCompleteAt?: number;
  /** url to use when auto-completing the build. */
  autoCompleteUrl?: string;
  submission: {
    status: SubmissionStatus;
    score?: number;
    feedback?: string;
    submissionId?: string;
    proposedCategory?: string;
    proposedTagline?: string;
    prUrl?: string;
  };
  hidden?: boolean;
};

export type BuildProgressPatch = {
  lastEventId?: string;
  lastStage?: string;
  lastMessage?: string;
};

type CreatedState = {
  apps: CreatedApp[];
  hydrated: boolean;
  addApp: (app: CreatedApp) => void;
  removeApp: (id: string) => void;
  hideApp: (id: string) => void;
  markBuilt: (id: string, url: string) => void;
  markFailed: (id: string, error: string) => void;
  retryBuild: (id: string) => void;
  updateBuildProgress: (id: string, patch: BuildProgressPatch) => void;
  markLive: (id: string) => void;
  resetSubmission: (id: string) => void;
  updateSubmission: (
    id: string,
    patch: Partial<CreatedApp['submission']>,
  ) => void;
  reset: () => void;
};

// Demo seeds — three real hosted apps that simulate prior AI builds.
// Each is a real, working web app served from the agentos-appstore Pages site.
// Different submission states so all UI flows are demonstrable in one tap.
// Empty by default for the demo recording: BY YOU is blank until the user
// builds an app via Create. Magic prompts (todo, calculator, tic tac toe)
// auto-complete after a delay and land here.
const MOCK_SEED: CreatedApp[] = [];

export const useCreated = create<CreatedState>()(
  persist(
    (set) => ({
      apps: MOCK_SEED,
      hydrated: false,
      addApp: (app) =>
        set((s) =>
          s.apps.some((x) => x.id === app.id) ? s : { apps: [app, ...s.apps] },
        ),
      removeApp: (id) =>
        set((s) => ({ apps: s.apps.filter((x) => x.id !== id) })),
      hideApp: (id) =>
        set((s) => ({
          apps: s.apps.map((x) => (x.id === id ? { ...x, hidden: true } : x)),
        })),
      markBuilt: (id, url) =>
        set((s) => ({
          apps: s.apps.map((x) =>
            x.id === id
              ? {
                  ...x,
                  buildStatus: 'built',
                  builtAt: Date.now(),
                  url: url || x.url,
                  error: undefined,
                }
              : x,
          ),
        })),
      markFailed: (id, error) =>
        set((s) => ({
          apps: s.apps.map((x) =>
            x.id === id ? { ...x, buildStatus: 'failed', error } : x,
          ),
        })),
      retryBuild: (id) =>
        set((s) => ({
          apps: s.apps.map((x) =>
            x.id === id
              ? {
                  ...x,
                  buildStatus: 'building',
                  buildStartedAt: Date.now(),
                  error: undefined,
                  lastEventId: undefined,
                  lastStage: undefined,
                  lastMessage: undefined,
                }
              : x,
          ),
        })),
      updateBuildProgress: (id, patch) =>
        set((s) => ({
          apps: s.apps.map((x) =>
            x.id === id
              ? {
                  ...x,
                  ...(patch.lastEventId !== undefined ? { lastEventId: patch.lastEventId } : {}),
                  ...(patch.lastStage !== undefined ? { lastStage: patch.lastStage } : {}),
                  ...(patch.lastMessage !== undefined ? { lastMessage: patch.lastMessage } : {}),
                }
              : x,
          ),
        })),
      markLive: (id) =>
        set((s) => ({
          apps: s.apps.map((x) =>
            x.id === id
              ? {
                  ...x,
                  hidden: false,
                  submission: { ...x.submission, status: 'live' },
                }
              : x,
          ),
        })),
      resetSubmission: (id) =>
        set((s) => ({
          apps: s.apps.map((x) =>
            x.id === id
              ? {
                  ...x,
                  hidden: false,
                  submission: {
                    status: 'not_submitted',
                    proposedCategory: x.submission.proposedCategory,
                    proposedTagline: x.submission.proposedTagline,
                  },
                }
              : x,
          ),
        })),
      updateSubmission: (id, patch) =>
        set((s) => ({
          apps: s.apps.map((x) =>
            x.id === id
              ? { ...x, submission: { ...x.submission, ...patch } }
              : x,
          ),
        })),
      reset: () => set({ apps: MOCK_SEED }),
    }),
    {
      name: 'agentos-created-v8',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ apps: s.apps }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function visibleCreatedApps(apps: CreatedApp[]): CreatedApp[] {
  return apps.filter((a) => !a.hidden && a.submission.status !== 'rejected');
}
