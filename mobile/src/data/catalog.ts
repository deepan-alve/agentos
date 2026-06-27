import type { BrandSlug } from '@/src/components/BrandIcon';

export type Category = 'reading' | 'productivity' | 'developer' | 'media' | 'misc';

export type CatalogApp = {
  id: string;
  name: string;
  tagline: string;
  category: Category;
  url: string;
  slug: BrandSlug;
  color: string;
  tintWhite?: boolean;
  generated?: boolean;
};

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'developer', label: 'Developer' },
  { id: 'media', label: 'Media' },
  { id: 'misc', label: 'Misc' },
];

export const CATALOG: CatalogApp[] = [
  {
    id: 'substack',
    name: 'Substack',
    tagline: 'Long-form writing, by the people you trust',
    category: 'reading',
    url: 'https://substack.com',
    slug: 'substack',
    color: '#FF6719',
  },
  {
    id: 'medium',
    name: 'Medium',
    tagline: 'Stories worth reading',
    category: 'reading',
    url: 'https://medium.com',
    slug: 'medium',
    color: '#FFFFFF',
    tintWhite: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    tagline: 'Notes, docs, and a brain you can search',
    category: 'productivity',
    url: 'https://notion.so',
    slug: 'notion',
    color: '#FFFFFF',
    tintWhite: true,
  },
  {
    id: 'figma',
    name: 'Figma',
    tagline: 'Design files, in your pocket',
    category: 'productivity',
    url: 'https://figma.com',
    slug: 'figma',
    color: '#F24E1E',
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    tagline: 'Answers from people who built it',
    category: 'developer',
    url: 'https://stackoverflow.com',
    slug: 'stackoverflow',
    color: '#F58025',
  },
  {
    id: 'devdotto',
    name: 'dev.to',
    tagline: 'A community where developers write',
    category: 'developer',
    url: 'https://dev.to',
    slug: 'devdotto',
    color: '#FFFFFF',
    tintWhite: true,
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    tagline: 'What launched today',
    category: 'productivity',
    url: 'https://www.producthunt.com',
    slug: 'producthunt',
    color: '#DA552F',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    tagline: 'Sound and silence, on demand',
    category: 'media',
    url: 'https://open.spotify.com',
    slug: 'spotify',
    color: '#1ED760',
  },
];

export function getCatalogApp(id: string): CatalogApp | undefined {
  return CATALOG.find((a) => a.id === id);
}
