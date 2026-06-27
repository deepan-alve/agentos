import { router } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandIcon } from '@/src/components/BrandIcon';
import { GeneratedIcon } from '@/src/components/GeneratedIcon';
import { CATEGORIES, type CatalogApp, type Category } from '@/src/data/catalog';
import { useCatalog } from '@/src/data/remote-catalog';
import { useCreated } from '@/src/store/created';
import { useLibrary } from '@/src/store/library';
import { C, F } from '@/src/theme/colors';

const WALLPAPER = require('@/assets/wallpaper.jpg');
const H_PADDING = 24;

type Filter = Category | 'all';

export default function StoreScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const { catalog, source, loading, refresh } = useCatalog();
  const [refreshing, setRefreshing] = useState(false);

  const onPullRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered =
    filter === 'all' ? catalog : catalog.filter((a) => a.category === filter);

  return (
    <ImageBackground source={WALLPAPER} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.header, { paddingHorizontal: H_PADDING }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.55 }]}
            >
              <ChevronLeft size={22} color={C.textDim} strokeWidth={1.5} />
              <Text style={styles.backTxt} allowFontScaling={false}>
                HOME
              </Text>
            </Pressable>
            <View style={styles.kickerRow}>
              <Text style={styles.kicker} allowFontScaling={false}>
                AGENT/OS · STORE
              </Text>
              <View
                style={[
                  styles.sourcePill,
                  source === 'remote' ? styles.sourcePillLive : styles.sourcePillBundled,
                ]}
              >
                <View
                  style={[
                    styles.sourceDot,
                    {
                      backgroundColor:
                        source === 'remote' ? '#7CE7C7' : C.textMute,
                    },
                  ]}
                />
                <Text style={styles.sourceTxt} allowFontScaling={false}>
                  {loading ? 'SYNC' : source === 'remote' ? 'LIVE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.heroRow}>
            <Text style={styles.hero} allowFontScaling={false}>
              Store
            </Text>
            <Text style={styles.heroCount} allowFontScaling={false}>
              {catalog.length} apps
            </Text>
          </View>
          <Text style={styles.heroSub} allowFontScaling={false}>
            curated, mobile-first.{'  '}install instantly.
          </Text>
        </View>

        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterRow, { paddingHorizontal: H_PADDING }]}
          >
            <FilterChip
              label="All"
              active={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c.id}
                label={c.label}
                active={filter === c.id}
                onPress={() => setFilter(c.id)}
              />
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: H_PADDING }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={C.text}
              colors={[C.text]}
              progressBackgroundColor={C.bg}
            />
          }
        >
          {filtered.map((app, idx) => (
            <View key={app.id}>
              <CatalogRow app={app} />
              {idx < filtered.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipTxt, active && styles.chipTxtActive]} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  );
}

function CatalogRow({ app }: { app: CatalogApp }) {
  const installed = useLibrary((s) => s.installed.some((x) => x.id === app.id));
  const install = useLibrary((s) => s.install);
  const isMine = useCreated((s) => s.apps.some((x) => x.id === app.id));

  // If user already has this app (installed OR built it themselves), opening
  // is the only action. Don't install duplicates.
  const alreadyHave = installed || isMine;

  const onPrimary = () => {
    if (alreadyHave) {
      router.push(`/app/${app.id}`);
    } else {
      install(app);
    }
  };

  const renderIconColor = app.tintWhite ? '#FFFFFF' : app.color;

  return (
    <Pressable
      onPress={onPrimary}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.iconTile}>
        {app.generated ? (
          <GeneratedIcon seed={app.id} name={app.name} size={28} />
        ) : (
          <BrandIcon slug={app.slug} size={30} color={renderIconColor} />
        )}
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowName} allowFontScaling={false} numberOfLines={1}>
          {app.name}
        </Text>
        <Text style={styles.rowTag} allowFontScaling={false} numberOfLines={2}>
          {app.tagline}
        </Text>
      </View>
      <View style={[styles.installBtn, alreadyHave && styles.installedBtn]}>
        {alreadyHave ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Check size={11} color={C.bg} strokeWidth={3} />
            <Text style={styles.installedTxt} allowFontScaling={false}>
              {isMine ? 'YOURS' : 'OPEN'}
            </Text>
          </View>
        ) : (
          <Text style={styles.installTxt} allowFontScaling={false}>
            INSTALL
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)' },
  safe: { flex: 1 },
  header: { paddingTop: 14, paddingBottom: 18 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -6 },
  backTxt: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.4,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.6,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sourcePillLive: {
    backgroundColor: 'rgba(124,231,199,0.08)',
    borderColor: 'rgba(124,231,199,0.35)',
  },
  sourcePillBundled: {
    backgroundColor: C.glass,
    borderColor: C.glassEdge,
  },
  sourceDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  sourceTxt: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 8,
    letterSpacing: 1.4,
  },
  heroRow: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  hero: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 64,
    lineHeight: 70,
    letterSpacing: -2,
  },
  heroCount: {
    color: C.textDim,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    paddingBottom: 16,
  },
  heroSub: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  filterBar: { height: 60, flexShrink: 0 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipTxt: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.8,
  },
  chipTxtActive: {
    color: C.bg,
  },
  list: { flex: 1 },
  listContent: { paddingTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: { flex: 1 },
  rowName: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 16,
    letterSpacing: 0.1,
  },
  rowTag: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  installBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.glassActive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
  },
  installedBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  installTxt: {
    color: C.text,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  installedTxt: {
    color: C.bg,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginLeft: 70,
  },
});
