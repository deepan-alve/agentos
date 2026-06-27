import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ChevronLeft, CloudOff, RotateCw, Send, Trash2, X } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AppIcon } from '@/src/components/AppIcon';
import { GeneratedIcon } from '@/src/components/GeneratedIcon';
import { getAppById } from '@/src/data/apps';
import { getBuiltHtml } from '@/src/data/built-apps';
import { BrogentApiError, createBuild } from '@/src/lib/brogent-api';
import { getBrogentUrl } from '@/src/lib/build-config';
import { resolveApp } from '@/src/lib/resolve';
import { useCreated } from '@/src/store/created';
import { C, F } from '@/src/theme/colors';

function relativeTime(from: number, nowMs: number): string {
  const ms = Math.max(0, nowMs - from);
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

const DEMO_URLS: { keywords: RegExp; url: string }[] = [
  { keywords: /\b(todo|task|todolist|to-do|tasks?)\b/i, url: 'https://deepan-alve.github.io/agentos-appstore/apps/demo-todo/' },
  { keywords: /\b(calc|calculator|math|arithmetic)\b/i, url: 'https://deepan-alve.github.io/agentos-appstore/apps/demo-calculator/' },
  { keywords: /\b(tic[ -]?tac[ -]?toe|xo|noughts|game|3x3|3 by 3)\b/i, url: 'https://deepan-alve.github.io/agentos-appstore/apps/demo-tictactoe/' },
];

function pickDemoUrl(prompt: string): string {
  for (const c of DEMO_URLS) {
    if (c.keywords.test(prompt)) return c.url;
  }
  // Deterministic fallback by hash of prompt
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) | 0;
  return DEMO_URLS[Math.abs(h) % DEMO_URLS.length].url;
}

// Auto-complete delays per magic id. Todo runs long (60-80s) so the user
// can finish recording the other two while it builds. Calc and TTT are
// quick. Returns null for non-magic ids (no auto-complete).
function autoCompleteDelayMs(id: string): number | null {
  if (id === 'demo-calculator') return 7000 + Math.floor(Math.random() * 3000);  // 7-10s
  if (id === 'demo-tictactoe') return 13000 + Math.floor(Math.random() * 4000); // 13-17s
  if (id === 'demo-todo') return 60000 + Math.floor(Math.random() * 20000);     // 60-80s
  return null;
}

function urlForMagicId(id: string): string | null {
  if (id === 'demo-calculator') return 'https://deepan-alve.github.io/agentos-appstore/apps/demo-calculator/';
  if (id === 'demo-tictactoe') return 'https://deepan-alve.github.io/agentos-appstore/apps/demo-tictactoe/';
  if (id === 'demo-todo') return 'https://deepan-alve.github.io/agentos-appstore/apps/demo-todo/';
  return null;
}

function BuildingScreen({
  app,
  onCancel,
}: {
  app: {
    id: string;
    name: string;
    prompt: string;
    buildStartedAt: number;
    lastStage?: string;
    lastMessage?: string;
  };
  onCancel: () => void;
}) {
  const markBuilt = useCreated((s) => s.markBuilt);
  // Re-tick the relative time once a minute so it stays current
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // SSE progress arrives via the root subscription in app/_layout.tsx; it
  // calls updateBuildProgress / markBuilt / markFailed on the store, which
  // re-renders this screen with the new lastStage and lastMessage.

  // Long-press the icon to bail out and fall back to a curated demo URL.
  // Kept for the recording workflow; harmless if you don't trigger it.
  const onLongPressIcon = () => {
    const url = pickDemoUrl(app.prompt);
    markBuilt(app.id, url);
  };

  return (
    <View style={buildingStyles.container}>
      <SafeAreaView edges={['top']} style={buildingStyles.headerWrap}>
        <View style={buildingStyles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [buildingStyles.headerSide, pressed && { opacity: 0.55 }]}
          >
            <ChevronLeft size={26} color={C.text} strokeWidth={1.5} />
          </Pressable>
          <View style={buildingStyles.headerCenter}>
            <Text style={buildingStyles.headerKicker} allowFontScaling={false}>
              BUILDING
            </Text>
            <Text style={buildingStyles.headerTitle} numberOfLines={1} allowFontScaling={false}>
              {app.name}
            </Text>
          </View>
          <Pressable
            onPress={onCancel}
            hitSlop={12}
            style={({ pressed }) => [buildingStyles.headerSide, pressed && { opacity: 0.6 }]}
          >
            <Trash2 size={20} color={C.textDim} strokeWidth={1.5} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={buildingStyles.body}>
        <Pressable
          onLongPress={onLongPressIcon}
          delayLongPress={1200}
          style={({ pressed }) => [
            buildingStyles.iconWell,
            pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
          ]}
        >
          <GeneratedIcon seed={app.id} name={app.name} size={64} />
        </Pressable>

        <View style={buildingStyles.statusPill}>
          <View style={buildingStyles.statusDot} />
          <Text style={buildingStyles.statusTxt} allowFontScaling={false}>
            {app.lastStage ? `${app.lastStage.toUpperCase()} · BUILDING` : 'STILL BUILDING'}
          </Text>
        </View>

        <Text style={buildingStyles.title} allowFontScaling={false}>
          The agent is{'\n'}
          <Text style={buildingStyles.titleItalic}>still building</Text>{' '}
          your app.
        </Text>

        {app.lastMessage && (
          <Text style={buildingStyles.liveLog} numberOfLines={3} allowFontScaling={false}>
            {app.lastMessage}
          </Text>
        )}

        <Text style={buildingStyles.sub} allowFontScaling={false}>
          Come back after some time.{'\n'}
          You can close AgentOS — your build keeps running.
        </Text>

        <View style={buildingStyles.metaCard}>
          <View style={buildingStyles.metaRow}>
            <Text style={buildingStyles.metaLabel} allowFontScaling={false}>
              PROMPT
            </Text>
            <Text style={buildingStyles.metaValue} allowFontScaling={false}>
              "{app.prompt}"
            </Text>
          </View>
          <View style={buildingStyles.metaDivider} />
          <View style={buildingStyles.metaRow}>
            <Text style={buildingStyles.metaLabel} allowFontScaling={false}>
              STARTED
            </Text>
            <Text style={buildingStyles.metaValueMono} allowFontScaling={false}>
              {relativeTime(app.buildStartedAt, Date.now())}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function FailedScreen({
  app,
  onDiscard,
}: {
  app: { id: string; name: string; prompt: string; error?: string };
  onDiscard: () => void;
}) {
  const addApp = useCreated((s) => s.addApp);
  const removeApp = useCreated((s) => s.removeApp);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const onRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setRetryError(null);
    try {
      // Brogent doesn't reuse project ids — a retry is a brand new project
      // with a new id and slug. We swap the failed record for the fresh one
      // and route the user to the new id.
      const handle = 'guest';  // matches the create.tsx flow; identity store
                                // values are validated there before submit
      const created = await createBuild({
        brogentUrl: getBrogentUrl(),
        prompt: app.prompt,
        handle,
      });
      removeApp(app.id);
      const now = Date.now();
      addApp({
        id: created.id,
        brogentSlug: created.slug,
        name: app.name,
        prompt: app.prompt,
        url: '',
        createdAt: now,
        buildStatus: 'building',
        buildStartedAt: now,
        submission: { status: 'not_submitted' },
      });
      router.replace(`/app/${created.id}`);
    } catch (err) {
      const msg = err instanceof BrogentApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Could not reach the build agent.';
      setRetryError(msg);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={buildingStyles.container}>
      <SafeAreaView edges={['top']} style={buildingStyles.headerWrap}>
        <View style={buildingStyles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [buildingStyles.headerSide, pressed && { opacity: 0.55 }]}
          >
            <ChevronLeft size={26} color={C.text} strokeWidth={1.5} />
          </Pressable>
          <View style={buildingStyles.headerCenter}>
            <Text style={[buildingStyles.headerKicker, failedStyles.kicker]} allowFontScaling={false}>
              FAILED
            </Text>
            <Text style={buildingStyles.headerTitle} numberOfLines={1} allowFontScaling={false}>
              {app.name}
            </Text>
          </View>
          <Pressable
            onPress={onDiscard}
            hitSlop={12}
            style={({ pressed }) => [buildingStyles.headerSide, pressed && { opacity: 0.6 }]}
          >
            <Trash2 size={20} color={C.textDim} strokeWidth={1.5} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={buildingStyles.body}>
        <View style={[buildingStyles.iconWell, failedStyles.iconWellErr]}>
          <AlertTriangle size={42} color="#FF7A4D" strokeWidth={1.4} />
        </View>

        <View style={[buildingStyles.statusPill, failedStyles.pillErr]}>
          <View style={[buildingStyles.statusDot, failedStyles.dotErr]} />
          <Text style={[buildingStyles.statusTxt, failedStyles.txtErr]} allowFontScaling={false}>
            BUILD FAILED
          </Text>
        </View>

        <Text style={buildingStyles.title} allowFontScaling={false}>
          The agent{'\n'}
          <Text style={buildingStyles.titleItalic}>couldn't ship</Text>{' '}
          this build.
        </Text>

        {app.error && (
          <Text style={buildingStyles.sub} numberOfLines={6} allowFontScaling={false}>
            {app.error}
          </Text>
        )}

        <View style={buildingStyles.metaCard}>
          <View style={buildingStyles.metaRow}>
            <Text style={buildingStyles.metaLabel} allowFontScaling={false}>
              PROMPT
            </Text>
            <Text style={buildingStyles.metaValue} allowFontScaling={false}>
              "{app.prompt}"
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onRetry}
          disabled={retrying}
          style={({ pressed }) => [
            failedStyles.retryBtn,
            retrying && failedStyles.retryBtnDim,
            pressed && { opacity: 0.85 },
          ]}
        >
          <RotateCw size={14} color="#0a0a0c" strokeWidth={2.5} />
          <Text style={failedStyles.retryTxt} allowFontScaling={false}>
            {retrying ? 'STARTING…' : 'TRY AGAIN'}
          </Text>
        </Pressable>

        {retryError && (
          <Text style={failedStyles.errorLine} allowFontScaling={false}>
            {retryError}
          </Text>
        )}
      </View>
    </View>
  );
}

const failedStyles = StyleSheet.create({
  kicker: { color: '#FF7A4D' },
  iconWellErr: {
    backgroundColor: 'rgba(255,122,77,0.06)',
    borderColor: 'rgba(255,122,77,0.32)',
  },
  pillErr: {
    backgroundColor: 'rgba(255,122,77,0.08)',
    borderColor: 'rgba(255,122,77,0.34)',
  },
  dotErr: { backgroundColor: '#FF7A4D' },
  txtErr: { color: '#FF7A4D' },
  retryBtn: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  retryBtnDim: { opacity: 0.55 },
  retryTxt: {
    color: '#0a0a0c',
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  errorLine: {
    marginTop: 12,
    color: '#FF7A4D',
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});

const buildingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerWrap: { backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSide: { width: 36, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerKicker: {
    color: '#FFB54C',
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.4,
    marginBottom: 1,
  },
  headerTitle: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 36,
    gap: 18,
  },
  iconWell: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,181,76,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,181,76,0.32)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FFB54C',
  },
  statusTxt: {
    color: '#FFB54C',
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2,
  },
  title: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 4,
  },
  titleItalic: {
    fontFamily: F.serifItalic,
    fontSize: 30,
    letterSpacing: -1,
  },
  sub: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  liveLog: {
    color: C.textMute,
    fontFamily: F.mono,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  metaCard: {
    marginTop: 14,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  metaRow: { gap: 6 },
  metaLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.2,
  },
  metaValue: {
    color: C.textDim,
    fontFamily: F.serifItalic,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  metaValueMono: {
    color: C.textDim,
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  metaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
});

function StatusStrip({
  status,
  score,
}: {
  status: 'submitting' | 'queued_review' | 'approved_pending_merge' | 'live';
  score?: number;
}) {
  const meta: Record<typeof status, { color: string; label: string }> = {
    submitting: { color: '#FFB54C', label: 'SUBMITTING TO STORE' },
    queued_review: { color: '#FFB54C', label: 'AGENT REVIEWING' },
    approved_pending_merge: { color: '#7CE7C7', label: 'APPROVED · AWAITING MERGE' },
    live: { color: '#FFD75A', label: 'LIVE IN STORE' },
  };
  const m = meta[status];
  return (
    <View style={stripStyles.strip}>
      <View style={[stripStyles.dot, { backgroundColor: m.color }]} />
      <Text style={stripStyles.label} allowFontScaling={false}>
        {m.label}
      </Text>
      {score !== undefined && (
        <Text style={stripStyles.score} allowFontScaling={false}>
          · SCORE {score.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const stripStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 999 },
  label: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 1.8,
  },
  score: {
    color: C.textGhost,
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.4,
  },
});

export default function AppScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Subscribe to the created store so updates re-render this screen
  const createdApp = useCreated((s) => (id ? s.apps.find((a) => a.id === id) : undefined));
  const removeCreated = useCreated((s) => s.removeApp);
  const resolved = id ? resolveApp(id) : undefined;
  const systemApp = !resolved && id ? getAppById(id) : undefined;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Defensive: Android WebView occasionally swallows onLoadEnd for SPAs that
  // do early history.pushState (our router-shim case). Force-clear loading
  // after a hard cap so the user never gets stuck on an opaque spinner over
  // a fully-rendered app.
  const armLoadingTimeout = useCallback(() => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = setTimeout(() => setLoading(false), 4000);
  }, []);
  const clearLoading = useCallback(() => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  const retry = useCallback(() => {
    setErrorMsg(null);
    setLoading(true);
    armLoadingTimeout();
    webRef.current?.reload();
  }, [armLoadingTimeout]);

  // Building state — short-circuit before WebView logic
  if (createdApp && createdApp.buildStatus === 'building') {
    return (
      <BuildingScreen
        app={createdApp}
        onCancel={() => {
          Alert.alert(
            'Discard build?',
            'This removes "' + createdApp.name + '" from your phone. The agent on the laptop keeps running until it finishes; Brogent has no cancel endpoint.',
            [
              { text: 'Keep waiting', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  removeCreated(createdApp.id);
                  router.replace('/');
                },
              },
            ],
          );
        }}
      />
    );
  }

  // Failed state — agent build couldn't complete
  if (createdApp && createdApp.buildStatus === 'failed') {
    return (
      <FailedScreen
        app={createdApp}
        onDiscard={() => {
          Alert.alert(
            'Discard build?',
            'Remove "' + createdApp.name + '" from your phone.',
            [
              { text: 'Keep', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  removeCreated(createdApp.id);
                  router.replace('/');
                },
              },
            ],
          );
        }}
      />
    );
  }

  // Generated apps that have been marked built but have no URL yet
  // (shouldn't happen, but defensive)

  if (!resolved && !systemApp) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
            <ChevronLeft size={26} color={C.text} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Not found</Text>
          </View>
          <View style={styles.headerSide} />
        </View>
      </SafeAreaView>
    );
  }

  if (!resolved && systemApp && systemApp.type === 'system') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
            <X size={24} color={C.text} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{systemApp.name}</Text>
          </View>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.placeholderBody}>
          <View style={styles.placeholderTile}>
            <AppIcon icon={systemApp.icon} size={64} color={systemApp.color} />
          </View>
          <Text style={styles.placeholderTitle} allowFontScaling={false}>
            Conjure
          </Text>
          <Text style={styles.placeholderSub} allowFontScaling={false}>
            describe what you want.{'\n'}the agent builds it.{'\n'}coming next
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const app = resolved!;

  const isCreated = app.source === 'created';
  const created = app.createdRef;
  const status = created?.submission.status ?? 'not_submitted';
  const submitDisabled = isCreated && status !== 'not_submitted' && status !== 'rejected';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
            <ChevronLeft size={26} color={C.text} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerKicker} allowFontScaling={false}>
              {isCreated ? 'BUILT BY YOU' : 'VIEWING'}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1} allowFontScaling={false}>
              {app.name}
            </Text>
          </View>
          {isCreated ? (
            <Pressable
              onPress={() =>
                !submitDisabled && router.push(`/app/submit/${encodeURIComponent(app.id)}`)
              }
              hitSlop={12}
              style={({ pressed }) => [
                styles.headerSide,
                pressed && { opacity: 0.6 },
              ]}
              disabled={submitDisabled}
            >
              <Send
                size={18}
                color={submitDisabled ? C.textGhost : C.text}
                strokeWidth={1.6}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => webRef.current?.reload()}
              hitSlop={12}
              style={styles.headerSide}
            >
              <RotateCw size={20} color={C.textDim} strokeWidth={1.5} />
            </Pressable>
          )}
        </View>
        {isCreated && status !== 'not_submitted' && status !== 'rejected' && (
          <StatusStrip status={status} score={created?.submission.score} />
        )}
      </SafeAreaView>
      <View style={styles.webviewWrap}>
        {!errorMsg && (
          <WebView
            ref={webRef}
            source={
              app.source === 'created' && getBuiltHtml(app.id)
                ? {
                    html: getBuiltHtml(app.id)!,
                    baseUrl: `https://deepan-alve.github.io/agentos-appstore/apps/${app.id}/`,
                  }
                : { uri: app.url }
            }
            originWhitelist={['*']}
            style={styles.webview}
            onLoadStart={() => {
              setLoading(true);
              setErrorMsg(null);
              armLoadingTimeout();
            }}
            onLoadEnd={clearLoading}
            // Some Android WebViews don't fire onLoadEnd reliably for SPAs.
            // Use progress as a secondary signal so the spinner clears even
            // if onLoadEnd is swallowed.
            onLoadProgress={({ nativeEvent }) => {
              if (nativeEvent.progress >= 0.99) clearLoading();
            }}
            onError={(e) => {
              clearLoading();
              setErrorMsg(e.nativeEvent.description || 'failed to load');
            }}
            onHttpError={(e) => {
              clearLoading();
              setErrorMsg(`HTTP ${e.nativeEvent.statusCode}`);
            }}
            renderError={() => <View />}
            domStorageEnabled
            javaScriptEnabled
            // Generated apps live at http://192.168.x.x:3001/p/<slug> and load
            // assets/PB from the same scheme. Without these, Android blocks
            // the http frame as mixed content / cleartext.
            mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
            thirdPartyCookiesEnabled
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
          />
        )}
        {loading && !errorMsg && (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color={C.text} />
          </View>
        )}
        {errorMsg && (
          <View style={styles.errorBody}>
            <View style={styles.errorIcon}>
              <CloudOff size={32} color={C.textDim} strokeWidth={1.4} />
            </View>
            <Text style={styles.errorTitle} allowFontScaling={false}>
              Can't reach{' '}
              <Text style={styles.errorTitleItalic}>{app.name}</Text>
            </Text>
            <Text style={styles.errorSub} allowFontScaling={false}>
              {errorMsg}
            </Text>
            <Pressable
              onPress={retry}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <RotateCw size={14} color={C.bg} strokeWidth={2.5} />
              <Text style={styles.retryTxt} allowFontScaling={false}>
                RETRY
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerWrap: { backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSide: { width: 36, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerKicker: {
    color: C.textGhost,
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    marginBottom: 1,
  },
  headerTitle: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  webviewWrap: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.75)',
  },
  placeholderBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 22,
  },
  placeholderTile: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: C.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 48,
    letterSpacing: -1,
    marginTop: 8,
  },
  placeholderSub: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13.5,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  errorBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
    backgroundColor: C.bg,
  },
  errorIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: C.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 20,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  errorTitleItalic: {
    fontFamily: F.serifItalic,
    fontSize: 22,
  },
  errorSub: {
    color: C.textDim,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  retryBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  retryTxt: {
    color: C.bg,
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.6,
  },
});
