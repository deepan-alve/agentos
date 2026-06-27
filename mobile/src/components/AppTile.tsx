import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { InstalledApp } from '@/src/data/apps';
import { C, F } from '@/src/theme/colors';
import { AppIcon } from './AppIcon';

type Variant = 'grid' | 'dock';

export type TileBadge = 'reviewing' | 'approved' | 'live' | null;

const BADGE_COLORS: Record<Exclude<TileBadge, null>, string> = {
  reviewing: '#FFB54C',
  approved: '#7CE7C7',
  live: '#FFD75A',
};

export function AppTile({
  app,
  size,
  onPress,
  onLongPress,
  variant = 'grid',
  showLabel = true,
  badge = null,
}: {
  app: InstalledApp;
  size: number;
  onPress: () => void;
  onLongPress?: () => void;
  variant?: Variant;
  showLabel?: boolean;
  badge?: TileBadge;
}) {
  const iconSize = Math.round(size * 0.46);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.wrap,
        { width: size },
        pressed && styles.wrapPressed,
      ]}
      hitSlop={4}
    >
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.31),
          },
        ]}
      >
        <View style={styles.tileInner}>
          <AppIcon icon={app.icon} size={iconSize} color={app.color} />
        </View>
        <View style={styles.tileGloss} pointerEvents="none" />
        {badge && (
          <View
            style={[styles.badge, { backgroundColor: BADGE_COLORS[badge] }]}
            pointerEvents="none"
          />
        )}
      </View>
      {showLabel && (
        <Text style={styles.label} numberOfLines={1} allowFontScaling={false}>
          {app.name}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wrapPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  tile: {
    backgroundColor: C.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
    overflow: 'hidden',
  },
  tileInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.4)',
  },
  label: {
    color: C.textDim,
    fontSize: 11.5,
    marginTop: 8,
    letterSpacing: 0.2,
    fontFamily: F.body,
    textAlign: 'center',
  },
});
