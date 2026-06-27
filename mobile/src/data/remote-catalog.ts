import { useEffect, useState } from 'react';
import { CATALOG, type CatalogApp, type Category } from './catalog';

// Folder-driven catalog fetch.
//
// The repo's `apps/<id>/meta.json` is the source of truth for each app.
// Mobile lists `apps/` via the Contents API, then fetches each `meta.json`
// in parallel and aggregates them. No root catalog.json anymore — delete a
// folder on the repo and the app drops out of the store on next refresh.
//
// Authenticated with the same PAT used for submit (5000 req/hr instead of 60).

const REPO_OWNER = 'deepan-alve';
const REPO_NAME = 'agentos-appstore';
const APPS_PATH = 'apps';
const API = 'https://api.github.com';

const PAT: string =
  (process.env.EXPO_PUBLIC_GITHUB_PAT as string | undefined) ?? '';

type CatalogState = {
  catalog: CatalogApp[];
  source: 'bundled' | 'remote';
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

let memoryCache: CatalogApp[] | null = null;
let inflight: Promise<CatalogApp[]> | null = null;

const VALID_CATEGORIES: Category[] = [
  'reading',
  'productivity',
  'developer',
  'media',
  'misc',
];

function normalize(raw: unknown): CatalogApp | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== 'string' ||
    typeof o.name !== 'string' ||
    typeof o.url !== 'string' ||
    typeof o.slug !== 'string'
  ) {
    return null;
  }
  const category: Category = VALID_CATEGORIES.includes(o.category as Category)
    ? (o.category as Category)
    : 'misc';
  return {
    id: o.id,
    name: o.name,
    tagline: typeof o.tagline === 'string' ? o.tagline : '',
    url: o.url,
    slug: o.slug,
    color: typeof o.color === 'string' ? o.color : '#FFFFFF',
    tintWhite: o.tintWhite === true,
    generated: o.generated === true,
    category,
  };
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (PAT) base.Authorization = `Bearer ${PAT}`;
  return { ...base, ...extra };
}

type DirEntry = { type: 'dir' | 'file'; name: string; path: string };

async function fetchFolderList(): Promise<string[]> {
  const url = `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${APPS_PATH}?ref=main`;
  const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`list apps/: HTTP ${res.status}`);
  const json = (await res.json()) as DirEntry[];
  if (!Array.isArray(json)) throw new Error('apps/ did not return a directory listing');
  return json.filter((e) => e.type === 'dir').map((e) => e.name);
}

async function fetchMeta(folder: string): Promise<CatalogApp | null> {
  const url = `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${APPS_PATH}/${folder}/meta.json?ref=main`;
  try {
    const res = await fetch(url, {
      headers: authHeaders({ Accept: 'application/vnd.github.raw+json' }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    return normalize(raw);
  } catch {
    return null;
  }
}

async function fetchRemote(): Promise<CatalogApp[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const folders = await fetchFolderList();
    const metas = await Promise.all(folders.map(fetchMeta));
    const cat = metas.filter((m): m is CatalogApp => !!m);
    if (cat.length === 0) throw new Error('no apps found in apps/');
    memoryCache = cat;
    return cat;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function useCatalog(): CatalogState {
  const [state, setState] = useState<Omit<CatalogState, 'refresh'>>(() => ({
    catalog: memoryCache ?? CATALOG,
    source: memoryCache ? 'remote' : 'bundled',
    loading: !memoryCache,
  }));

  const doFetch = async (force: boolean) => {
    if (memoryCache && !force) return;
    if (force) memoryCache = null;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const cat = await fetchRemote();
      setState({ catalog: cat, source: 'remote', loading: false });
    } catch (e: unknown) {
      setState({
        catalog: CATALOG,
        source: 'bundled',
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  useEffect(() => {
    if (memoryCache) return;
    let cancelled = false;
    fetchRemote()
      .then((cat) => {
        if (cancelled) return;
        setState({ catalog: cat, source: 'remote', loading: false });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          catalog: CATALOG,
          source: 'bundled',
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, refresh: () => doFetch(true) };
}

export function getMemoryCatalog(): CatalogApp[] {
  return memoryCache ?? CATALOG;
}
