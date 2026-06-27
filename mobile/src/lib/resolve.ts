import type { AppIcon, InstalledApp } from '@/src/data/apps';
import { getAppById } from '@/src/data/apps';
import type { CatalogApp } from '@/src/data/catalog';
import { getMemoryCatalog } from '@/src/data/remote-catalog';
import { useCreated, type CreatedApp } from '@/src/store/created';
import { useLibrary } from '@/src/store/library';

export type ResolvedApp = {
  id: string;
  name: string;
  url: string;
  icon: AppIcon;
  color: string;
  source: 'preinstalled' | 'library' | 'catalog' | 'created';
  createdRef?: CreatedApp;
};

function fromCatalogApp(c: CatalogApp, source: 'library' | 'catalog'): ResolvedApp {
  return {
    id: c.id,
    name: c.name,
    url: c.url,
    icon: { kind: 'brand', slug: c.slug, tintWhite: c.tintWhite },
    color: c.color,
    source,
  };
}

function fromCreated(c: CreatedApp): ResolvedApp {
  return {
    id: c.id,
    name: c.name,
    url: c.url,
    icon: { kind: 'generated', seed: c.id, name: c.name },
    color: '#FFFFFF',
    source: 'created',
    createdRef: c,
  };
}

export function resolveApp(id: string): ResolvedApp | undefined {
  const pre = getAppById(id);
  if (pre && pre.type === 'webview') {
    return {
      id: pre.id,
      name: pre.name,
      url: pre.url,
      icon: pre.icon,
      color: pre.color,
      source: 'preinstalled',
    };
  }
  const inCreated = useCreated.getState().apps.find((a) => a.id === id);
  if (inCreated) return fromCreated(inCreated);
  const inLib = useLibrary.getState().getInstalled(id);
  if (inLib) return fromCatalogApp(inLib, 'library');
  const inCat = getMemoryCatalog().find((c) => c.id === id);
  if (inCat) return fromCatalogApp(inCat, 'catalog');
  return undefined;
}

export function asInstalledTile(r: ResolvedApp): InstalledApp {
  return {
    id: r.id,
    type: 'webview',
    name: r.name,
    icon: r.icon,
    color: r.color,
    url: r.url,
  };
}
