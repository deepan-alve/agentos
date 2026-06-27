import * as allSimpleIcons from 'simple-icons';
import Svg, { Path } from 'react-native-svg';

type SimpleIcon = { path: string; title: string; hex: string };

const ICONS_BY_KEY: Record<string, SimpleIcon> = (() => {
  const out: Record<string, SimpleIcon> = {};
  for (const [k, v] of Object.entries(allSimpleIcons as Record<string, unknown>)) {
    if (k.startsWith('si') && v && typeof v === 'object' && 'path' in (v as object)) {
      out[k.toLowerCase()] = v as SimpleIcon;
    }
  }
  return out;
})();

export type BrandSlug = string;

export function lookupBrand(slug: string): SimpleIcon | undefined {
  if (!slug) return undefined;
  const key = ('si' + slug).toLowerCase();
  return ICONS_BY_KEY[key];
}

export function BrandIcon({
  slug,
  size,
  color,
}: {
  slug: BrandSlug;
  size: number;
  color: string;
}) {
  const icon = lookupBrand(slug);
  if (!icon) {
    return <Svg width={size} height={size} viewBox="0 0 24 24" />;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={icon.path} fill={color} />
    </Svg>
  );
}
