import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTile, type TileBadge } from '@/src/components/AppTile';
import { GeneratedIcon } from '@/src/components/GeneratedIcon';
import { getDockApps, getGridApps, type InstalledApp } from '@/src/data/apps';
import { useCatalog } from '@/src/data/remote-catalog';
import { useCreated, visibleCreatedApps, type CreatedApp } from '@/src/store/created';
import { useLibrary } from '@/src/store/library';
import { C, F } from '@/src/theme/colors';

const WALLPAPER = require('@/assets/wallpaper.jpg');

const COLUMNS = 4;
const H_PADDING = 26;
const GAP = 14;
const DOCK_INSET = 12;
const PARALLAX_AMPLITUDE = 60;

const PAGES = [
  { id: 'home', kicker: 'HOME', title: 'Apps' },
  { id: 'library', kicker: 'LIBRARY', title: 'Installed' },
  { id: 'created', kicker: 'BY YOU', title: 'Conjured' },
] as const;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function relTime(from: number, now: number): string {
  const ms = Math.max(0, now - from);
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min === 1) return '1 min ago';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr === 1) return '1 hr ago';
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

function BuildingRow({ app, onPress }: { app: CreatedApp; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.buildingRow, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.buildingIcon}>
        <GeneratedIcon seed={app.id} name={app.name} size={32} />
      </View>
      <View style={styles.buildingBody}>
        <Text style={styles.buildingName} numberOfLines={1} allowFontScaling={false}>
          {app.name}
        </Text>
        <Text style={styles.buildingPrompt} numberOfLines={1} allowFontScaling={false}>
          "{app.prompt}"
        </Text>
      </View>
      <View style={styles.buildingMeta}>
        <View style={styles.buildingMetaDot} />
        <Text style={styles.buildingMetaTxt} allowFontScaling={false}>
          {relTime(app.buildStartedAt, Date.now()).toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

function badgeFor(app: CreatedApp): TileBadge {
  if (app.buildStatus === 'building') return 'reviewing';
  const status = app.submission.status;
  if (status === 'submitting' || status === 'queued_review') return 'reviewing';
  if (status === 'approved_pending_merge') return 'approved';
  if (status === 'live') return 'live';
  return null;
}

function formatNow() {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  const hours24 = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;
  return { weekday, day, month, year, hours12, minutes, ampm };
}

function useLiveNow() {
  const [now, setNow] = useState(formatNow);
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const tick = () => setNow(formatNow());
    // align first tick to next minute boundary, then run every 30s
    const ms = 60_000 - (Date.now() % 60_000);
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 30_000);
    }, ms);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
  return now;
}

export default function Home() {
  const { width } = Dimensions.get('window');
  const tileSize = Math.floor((width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const dockSize = Math.floor(tileSize * 0.96);

  const grid = getGridApps();
  const dock = getDockApps();
  const installedList = useLibrary((s) => s.installed);
  const uninstall = useLibrary((s) => s.uninstall);
  const createdList = useCreated((s) => s.apps);
  const markLive = useCreated((s) => s.markLive);
  const resetSubmission = useCreated((s) => s.resetSubmission);
  const removeCreated = useCreated((s) => s.removeApp);
  const { catalog, source } = useCatalog();

  // Whenever the remote catalog is fetched, reconcile our created apps:
  //   - app in catalog → mark live + unhide
  //   - app NOT in catalog but previously live/pending → reset to not_submitted
  // This makes the demo idempotent: delete the folder on GitHub, the app
  // resets to its fresh "ready to submit" state on the phone.
  useEffect(() => {
    if (source !== 'remote') return;
    const catalogIds = new Set(catalog.map((c) => c.id));
    for (const a of createdList) {
      if (catalogIds.has(a.id)) {
        const shouldFlip = a.submission.status !== 'live' || a.hidden === true;
        if (shouldFlip) markLive(a.id);
      } else {
        const wasSubmitted =
          a.submission.status === 'live' ||
          a.submission.status === 'approved_pending_merge';
        if (wasSubmitted) resetSubmission(a.id);
      }
    }
  }, [catalog, source, createdList, markLive, resetSubmission]);
  // Dedupe: an app in BY YOU shouldn't also show in Library — it's the same app.
  const createdIdSet = useMemo(
    () => new Set(createdList.map((c) => c.id)),
    [createdList],
  );
  const installedApps: InstalledApp[] = useMemo(
    () =>
      installedList
        .filter((c) => !createdIdSet.has(c.id))
        .map((c) => ({
          id: c.id,
          type: 'webview' as const,
          name: c.name,
          icon: c.generated
            ? { kind: 'generated' as const, seed: c.id, name: c.name }
            : { kind: 'brand' as const, slug: c.slug, tintWhite: c.tintWhite },
          color: c.color,
          url: c.url,
        })),
    [installedList, createdIdSet],
  );
  const createdApps = useMemo(() => visibleCreatedApps(createdList), [createdList]);
  const buildingApps = useMemo(
    () => createdApps.filter((a) => a.buildStatus === 'building'),
    [createdApps],
  );
  const builtApps = useMemo(
    () => createdApps.filter((a) => a.buildStatus === 'built'),
    [createdApps],
  );
  const builtAsInstalled: InstalledApp[] = useMemo(
    () =>
      builtApps.map((c) => ({
        id: c.id,
        type: 'webview' as const,
        name: c.name,
        icon: { kind: 'generated' as const, seed: c.id, name: c.name },
        color: '#FFFFFF',
        url: c.url,
      })),
    [builtApps],
  );

  const now = useLiveNow();
  const [pageIdx, setPageIdx] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== pageIdx) setPageIdx(next);
  };

  const onTap = (app: InstalledApp) => {
    router.push(`/app/${app.id}`);
  };

  const onLongPressInstalled = (app: InstalledApp) => {
    Alert.alert(
      app.name,
      'Remove this app from your library?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Uninstall', style: 'destructive', onPress: () => uninstall(app.id) },
      ],
      { cancelable: true },
    );
  };

  const onLongPressCreated = (app: InstalledApp) => {
    Alert.alert(
      app.name,
      'Delete this app from BY YOU?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeCreated(app.id) },
      ],
      { cancelable: true },
    );
  };

  const wallpaperTx = scrollX.interpolate({
    inputRange: [0, Math.max(1, width * (PAGES.length - 1))],
    outputRange: [0, -PARALLAX_AMPLITUDE],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.bg}>
      <Animated.View
        style={[
          styles.wallpaperWrap,
          { width: width + PARALLAX_AMPLITUDE, transform: [{ translateX: wallpaperTx }] },
        ]}
      >
        <ImageBackground source={WALLPAPER} style={styles.wallpaperImg} resizeMode="cover" />
      </Animated.View>
      <View style={styles.overlay} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.header, { paddingHorizontal: H_PADDING }]}>
          <View style={styles.headerRow}>
            <Text style={styles.wordmark} allowFontScaling={false}>
              AGENT<Text style={styles.wordmarkSlash}>/</Text>OS
            </Text>
            <Text style={styles.headerMeta} allowFontScaling={false}>
              {now.month} {pad(now.day)} · {now.year}
            </Text>
          </View>
          <View style={styles.headerHero}>
            <Text style={styles.heroSerif} allowFontScaling={false}>
              {now.weekday}
            </Text>
            <Text style={styles.heroTime} allowFontScaling={false}>
              {now.hours12}:{now.minutes}
              <Text style={styles.heroTimeAm}> {now.ampm}</Text>
            </Text>
          </View>
        </View>

        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false, listener: onScroll },
          )}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={styles.pagerFlex}
        >
          {PAGES.map((page, idx) => (
            <View key={page.id} style={[styles.page, { width }]}>
              <View style={[styles.pageHeader, { paddingHorizontal: H_PADDING }]}>
                <Text style={styles.pageKicker} allowFontScaling={false}>
                  {page.kicker}
                </Text>
                <Text style={styles.pageNum} allowFontScaling={false}>
                  {pad(idx + 1)} / {pad(PAGES.length)}
                </Text>
              </View>

              {idx === 0 && (
                <View style={[styles.grid, { paddingHorizontal: H_PADDING, gap: GAP }]}>
                  {grid.map((app) => (
                    <AppTile
                      key={app.id}
                      app={app}
                      size={tileSize}
                      onPress={() => onTap(app)}
                    />
                  ))}
                </View>
              )}

              {idx === 1 && installedApps.length === 0 && (
                <View style={styles.emptyPage}>
                  <Text style={styles.emptyTitle} allowFontScaling={false}>
                    {page.title}
                  </Text>
                  <Text style={styles.emptyHint} allowFontScaling={false}>
                    apps you install from the store{'\n'}will appear here
                  </Text>
                  <Text style={styles.emptyHintMono} allowFontScaling={false}>
                    LONG-PRESS · UNINSTALL
                  </Text>
                </View>
              )}

              {idx === 1 && installedApps.length > 0 && (
                <View style={[styles.grid, { paddingHorizontal: H_PADDING, gap: GAP }]}>
                  {installedApps.map((app) => (
                    <AppTile
                      key={app.id}
                      app={app}
                      size={tileSize}
                      onPress={() => onTap(app)}
                      onLongPress={() => onLongPressInstalled(app)}
                    />
                  ))}
                </View>
              )}

              {idx === 2 && createdApps.length === 0 && (
                <View style={styles.emptyPage}>
                  <Text style={styles.emptyTitle} allowFontScaling={false}>
                    {page.title}
                  </Text>
                  <Text style={styles.emptyHint} allowFontScaling={false}>
                    apps you ask the agent to build{'\n'}will appear here
                  </Text>
                  <Text style={styles.emptyHintMono} allowFontScaling={false}>
                    OPEN CREATE · DESCRIBE · BUILD
                  </Text>
                </View>
              )}

              {idx === 2 && createdApps.length > 0 && (
                <View>
                  {buildingApps.length > 0 && (
                    <View style={{ paddingHorizontal: H_PADDING, marginBottom: 22 }}>
                      <View style={styles.subHeaderRow}>
                        <View style={styles.subHeaderDot} />
                        <Text style={styles.subHeader} allowFontScaling={false}>
                          STILL BUILDING · {pad(buildingApps.length)}
                        </Text>
                      </View>
                      <View style={styles.buildingList}>
                        {buildingApps.map((b) => (
                          <BuildingRow
                            key={b.id}
                            app={b}
                            onPress={() => router.push(`/app/${b.id}`)}
                          />
                        ))}
                      </View>
                    </View>
                  )}

                  {builtAsInstalled.length > 0 && (
                    <View>
                      {buildingApps.length > 0 && (
                        <View style={[styles.subHeaderRow, { paddingHorizontal: H_PADDING, marginBottom: 12 }]}>
                          <Text style={styles.subHeader} allowFontScaling={false}>
                            BUILT · {pad(builtAsInstalled.length)}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.grid, { paddingHorizontal: H_PADDING, gap: GAP }]}>
                        {builtAsInstalled.map((app, i) => {
                          const ref = builtApps[i];
                          return (
                            <AppTile
                              key={app.id}
                              app={app}
                              size={tileSize}
                              onPress={() => onTap(app)}
                              onLongPress={() => onLongPressCreated(app)}
                              badge={badgeFor(ref)}
                            />
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </Animated.ScrollView>

        <View style={styles.pageIndicator}>
          {PAGES.map((_, idx) => (
            <View
              key={idx}
              style={idx === pageIdx ? styles.pageDotActive : styles.pageDot}
            />
          ))}
        </View>

        <View style={[styles.dockWrap, { paddingHorizontal: H_PADDING - DOCK_INSET }]}>
          <View
            style={[
              styles.dock,
              { paddingHorizontal: DOCK_INSET, paddingVertical: DOCK_INSET, gap: GAP },
            ]}
          >
            {dock.map((app) => (
              <AppTile
                key={app.id}
                app={app}
                size={dockSize}
                onPress={() => onTap(app)}
                variant="dock"
                showLabel={false}
              />
            ))}
          </View>
        </View>

        <View style={styles.homeIndicator} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  wallpaperWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  wallpaperImg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  safe: { flex: 1 },
  pagerFlex: { flex: 1 },
  page: { paddingTop: 4 },
  header: {
    paddingTop: 14,
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmark: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 3.2,
  },
  wordmarkSlash: {
    color: C.textGhost,
    fontFamily: F.mono,
  },
  headerMeta: {
    color: C.textMute,
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
  },
  headerHero: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroSerif: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.2,
  },
  heroTime: {
    color: C.textDim,
    fontFamily: F.mono,
    fontSize: 15,
    letterSpacing: 1.2,
    paddingBottom: 10,
  },
  heroTimeAm: {
    color: C.textGhost,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 18,
  },
  pageKicker: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.6,
  },
  pageNum: {
    color: C.textGhost,
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FFB54C',
  },
  subHeader: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.4,
  },
  buildingList: { gap: 6 },
  buildingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  buildingIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingBody: { flex: 1, gap: 2 },
  buildingName: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  buildingPrompt: {
    color: C.textDim,
    fontFamily: F.serifItalic,
    fontSize: 13,
    letterSpacing: 0.1,
  },
  buildingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buildingMetaDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#FFB54C',
  },
  buildingMetaTxt: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  emptyPage: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 44,
    letterSpacing: -1,
    marginBottom: 8,
  },
  emptyHint: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  emptyHintMono: {
    color: C.textGhost,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.6,
    marginTop: 6,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    height: 6,
  },
  pageDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.textGhost,
  },
  pageDotActive: {
    width: 18,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.text,
  },
  dockWrap: {
    paddingBottom: 18,
  },
  dock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.glassEdge,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  homeIndicator: {
    alignSelf: 'center',
    width: 130,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginBottom: 6,
  },
});
