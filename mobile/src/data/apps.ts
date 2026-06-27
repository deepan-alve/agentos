import type { BrandSlug } from '@/src/components/BrandIcon';

export type AppIcon =
  | { kind: 'brand'; slug: BrandSlug; tintWhite?: boolean }
  | { kind: 'lucide'; name: 'ShoppingBag' | 'Sparkles' | 'Compass' | 'Globe' | 'Wand2' }
  | { kind: 'generated'; seed: string; name: string };

export type InstalledApp =
  | {
      id: string;
      type: 'webview';
      name: string;
      icon: AppIcon;
      color: string;
      url: string;
    }
  | {
      id: string;
      type: 'system';
      name: string;
      icon: AppIcon;
      color: string;
      kind: 'appstore' | 'create';
    };

export const PREINSTALLED_APPS: InstalledApp[] = [
  {
    id: 'wikipedia',
    type: 'webview',
    name: 'Wikipedia',
    icon: { kind: 'brand', slug: 'wikipedia', tintWhite: true },
    color: '#FFFFFF',
    url: 'https://en.m.wikipedia.org',
  },
  {
    id: 'duckduckgo',
    type: 'webview',
    name: 'Search',
    icon: { kind: 'brand', slug: 'duckduckgo' },
    color: '#FF7A4D',
    url: 'https://duckduckgo.com',
  },
  {
    id: 'youtube',
    type: 'webview',
    name: 'YouTube',
    icon: { kind: 'brand', slug: 'youtube' },
    color: '#FF3D3D',
    url: 'https://m.youtube.com',
  },
  {
    id: 'hn',
    type: 'webview',
    name: 'Hacker News',
    icon: { kind: 'brand', slug: 'ycombinator' },
    color: '#F0652F',
    url: 'https://news.ycombinator.com',
  },
  {
    id: 'reddit',
    type: 'webview',
    name: 'Reddit',
    icon: { kind: 'brand', slug: 'reddit' },
    color: '#FF4500',
    url: 'https://m.reddit.com',
  },
  {
    id: 'github',
    type: 'webview',
    name: 'GitHub',
    icon: { kind: 'brand', slug: 'github', tintWhite: true },
    color: '#FFFFFF',
    url: 'https://github.com',
  },
  {
    id: 'store',
    type: 'system',
    name: 'Store',
    icon: { kind: 'lucide', name: 'Compass' },
    color: '#EAE4D8',
    kind: 'appstore',
  },
  {
    id: 'create',
    type: 'system',
    name: 'Create',
    icon: { kind: 'lucide', name: 'Sparkles' },
    color: '#FAFAFA',
    kind: 'create',
  },
];

export const DOCK_APP_IDS = ['duckduckgo', 'wikipedia', 'store', 'create'] as const;
export const GRID_APP_IDS = ['youtube', 'hn', 'reddit', 'github'] as const;

export function getAppById(id: string): InstalledApp | undefined {
  return PREINSTALLED_APPS.find((a) => a.id === id);
}

export function getGridApps(): InstalledApp[] {
  return GRID_APP_IDS.map((id) => getAppById(id)!).filter(Boolean);
}

export function getDockApps(): InstalledApp[] {
  return DOCK_APP_IDS.map((id) => getAppById(id)!).filter(Boolean);
}
