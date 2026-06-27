import { Compass, Globe, Sparkles, ShoppingBag, Wand2 } from 'lucide-react-native';

import type { AppIcon as AppIconSpec } from '@/src/data/apps';
import { BrandIcon } from './BrandIcon';
import { GeneratedIcon } from './GeneratedIcon';

const LUCIDE = {
  ShoppingBag,
  Sparkles,
  Compass,
  Globe,
  Wand2,
} as const;

export function AppIcon({
  icon,
  size,
  color,
}: {
  icon: AppIconSpec;
  size: number;
  color: string;
}) {
  if (icon.kind === 'brand') {
    const renderColor = icon.tintWhite ? '#FFFFFF' : color;
    return <BrandIcon slug={icon.slug} size={size} color={renderColor} />;
  }
  if (icon.kind === 'generated') {
    return <GeneratedIcon seed={icon.seed} name={icon.name} size={size} />;
  }
  const LucideCmp = LUCIDE[icon.name];
  return <LucideCmp size={size} color={color} strokeWidth={1.5} />;
}
