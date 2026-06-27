import { router } from 'expo-router';
import { ArrowUp, ChevronLeft, Menu, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuildsDrawer } from '@/src/components/BuildsDrawer';
import { BrogentApiError, createBuild } from '@/src/lib/brogent-api';
import { getBrogentUrl } from '@/src/lib/build-config';
// import { matchMagic } from '@/src/lib/magic'; // Magic-phrase demo path — disabled when wired to real backend. Re-enable if you want to demo offline.
import { useCreated, visibleCreatedApps } from '@/src/store/created';
import { useIdentity } from '@/src/store/identity';
import { C, F } from '@/src/theme/colors';

const WALLPAPER = require('@/assets/wallpaper.jpg');
const H_PADDING = 24;

const EXAMPLES = [
  'a stateful todo app with filters',
  'a calculator with operator precedence',
  'a tic tac toe game with score tracking',
  'a workout timer with rest intervals',
  'a daily journal with mood tracking',
];

function nameFromPrompt(prompt: string): string {
  const stripped = prompt.replace(/^(a|an|the|build|make|create|generate|me)\s+/gi, '');
  const word = stripped.split(/[\s,]+/).slice(0, 2).join(' ').trim();
  return (
    word
      .replace(/[^\w\s-]/g, '')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 24) || 'Untitled'
  );
}

// Legacy local-id generator from the mock-build days. Kept commented for
// reference — the canonical id now comes from the Brogent backend so phone
// and laptop agree on one id per project.
// function newAppId(): string {
//   return 'built_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// }

// Handle requirement enforced by Brogent's POST /api/projects: starts with
// a-z, contains only a-z 0-9 and dashes, 3–64 chars total.
const HANDLE_RE = /^[a-z][a-z0-9-]{2,63}$/;

function sanitizeHandle(input: string): string {
  // Lowercase, replace anything non-conforming with '-', collapse runs,
  // trim leading/trailing dashes. Returns '' if the result is unusable.
  const stripped = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (stripped.length < 3) return '';
  if (!/^[a-z]/.test(stripped)) return `u-${stripped}`.slice(0, 64);
  return stripped.slice(0, 64);
}

export default function CreateScreen() {
  const [prompt, setPrompt] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const handle = useIdentity((s) => s.handle);
  const addApp = useCreated((s) => s.addApp);
  // const removeApp = useCreated((s) => s.removeApp); // only used by the magic-prompt path
  const apps = useCreated((s) => s.apps);
  const buildingCount = useMemo(
    () => visibleCreatedApps(apps).filter((a) => a.buildStatus === 'building').length,
    [apps],
  );

  const canBuild = prompt.trim().length > 0 && !submitting;

  const onBuild = async () => {
    if (!canBuild) return;
    Keyboard.dismiss();
    const trimmed = prompt.trim();

    // -------- Magic-phrase demo path (disabled) --------
    // Re-enable this block if you want offline-demo magic prompts (todo,
    // calculator, tic-tac-toe) to use the persisted-timer auto-complete
    // path instead of hitting the real backend. Don't forget the imports.
    //
    // const magic = matchMagic(trimmed);
    // if (magic) {
    //   const now = Date.now();
    //   if (apps.some((a) => a.id === magic.id)) removeApp(magic.id);
    //   addApp({
    //     id: magic.id,
    //     name: magic.name,
    //     prompt: trimmed,
    //     url: '',
    //     createdAt: now,
    //     buildStatus: 'building',
    //     buildStartedAt: now,
    //     autoCompleteAt: now + magic.delayMs,
    //     autoCompleteUrl: magic.url,
    //     submission: { status: 'not_submitted' },
    //   });
    //   setPrompt('');
    //   router.replace(`/app/${magic.id}`);
    //   return;
    // }
    // ---------------------------------------------------

    setSubmitError(null);
    setSubmitting(true);

    const rawHandle = handle || 'guest';
    const safeHandle = HANDLE_RE.test(rawHandle) ? rawHandle : sanitizeHandle(rawHandle);
    if (!safeHandle) {
      setSubmitError('Set a valid handle on the home screen first.');
      setSubmitting(false);
      return;
    }

    try {
      const created = await createBuild({
        brogentUrl: getBrogentUrl(),
        prompt: trimmed,
        handle: safeHandle,
      });
      const now = Date.now();
      addApp({
        id: created.id,
        brogentSlug: created.slug,
        name: nameFromPrompt(trimmed),
        prompt: trimmed,
        url: '',
        createdAt: now,
        buildStatus: 'building',
        buildStartedAt: now,
        submission: { status: 'not_submitted' },
      });
      setPrompt('');
      router.replace(`/app/${created.id}`);
    } catch (err) {
      const msg = err instanceof BrogentApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Could not reach the build agent. Check Settings → Brogent URL.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground source={WALLPAPER} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} pointerEvents="none" />
      <BuildsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.header, { paddingHorizontal: H_PADDING }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Pressable
                  onPress={() => setDrawerOpen(true)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.6 }]}
                >
                  <Menu size={18} color={C.text} strokeWidth={1.6} />
                  {buildingCount > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeTxt} allowFontScaling={false}>
                        {buildingCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
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
              </View>
              <Text style={styles.kicker} allowFontScaling={false}>
                AGENT/OS · CREATE
              </Text>
            </View>

            <View style={styles.heroBlock}>
              <Sparkles size={20} color={C.textDim} strokeWidth={1.5} />
              <Text style={styles.hero} allowFontScaling={false}>
                Conjure
              </Text>
              <Text style={styles.heroSub} allowFontScaling={false}>
                describe what you want.{'\n'}the agent builds it.
              </Text>
              <View style={styles.bylinePill}>
                <Text style={styles.bylineKicker} allowFontScaling={false}>
                  YOU ARE
                </Text>
                <Text style={styles.bylineHandle} allowFontScaling={false}>
                  @{handle || 'guest'}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.promptCard}>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="e.g. a stateful todo app with filters that survives reload"
                placeholderTextColor={C.textGhost}
                multiline
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="sentences"
              />
              <View style={styles.promptFooter}>
                <Text style={styles.promptHint} allowFontScaling={false}>
                  {prompt.length === 0
                    ? 'describe an app'
                    : `${prompt.length} character${prompt.length === 1 ? '' : 's'}`}
                </Text>
                <Pressable
                  onPress={onBuild}
                  disabled={!canBuild}
                  style={({ pressed }) => [
                    styles.buildBtn,
                    canBuild ? styles.buildBtnReady : styles.buildBtnDim,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.buildTxt,
                      canBuild ? styles.buildTxtReady : styles.buildTxtDim,
                    ]}
                    allowFontScaling={false}
                  >
                    {submitting ? 'SENDING…' : 'BUILD'}
                  </Text>
                  <ArrowUp
                    size={14}
                    color={canBuild ? C.bg : C.textGhost}
                    strokeWidth={2.5}
                  />
                </Pressable>
              </View>
              {submitError && (
                <Text style={styles.errorTxt} allowFontScaling={false}>
                  {submitError}
                </Text>
              )}
            </View>

            <View style={styles.examplesBlock}>
              <Text style={styles.examplesLabel} allowFontScaling={false}>
                IDEAS
              </Text>
              <View style={styles.exampleList}>
                {EXAMPLES.map((ex) => (
                  <Pressable
                    key={ex}
                    onPress={() => setPrompt(ex)}
                    style={({ pressed }) => [styles.example, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.exampleArrow} allowFontScaling={false}>
                      ↗
                    </Text>
                    <Text style={styles.exampleTxt} allowFontScaling={false}>
                      {ex}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fineprint}>
              <Text style={styles.fineprintTxt} allowFontScaling={false}>
                builds run on the agent backend. they take a while.{'  '}
                you can close this app — your build keeps running and shows up under{' '}
                <Text style={{ fontFamily: F.bodyBold }}>BY YOU</Text> when done.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  safe: { flex: 1 },
  header: { paddingTop: 14, paddingBottom: 14 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: -6,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: '#FFB54C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  menuBadgeTxt: {
    color: C.bg,
    fontFamily: F.monoBold,
    fontSize: 9,
    lineHeight: 11,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backTxt: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.4,
  },
  kicker: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.6,
  },
  heroBlock: { marginTop: 28, gap: 8 },
  hero: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -2,
  },
  heroSub: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  bylinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.glass,
    borderColor: C.glassEdge,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  bylineKicker: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.4,
  },
  bylineHandle: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  promptCard: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: C.glassEdge,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    padding: 18,
  },
  input: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 90,
    letterSpacing: 0.1,
    textAlignVertical: 'top',
  },
  promptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.divider,
  },
  promptHint: {
    color: C.textGhost,
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  errorTxt: {
    marginTop: 10,
    color: '#FF7A4D',
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  buildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buildBtnReady: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  buildBtnDim: { backgroundColor: C.glass, borderColor: C.glassEdge },
  buildTxt: { fontFamily: F.monoBold, fontSize: 10, letterSpacing: 1.8 },
  buildTxtReady: { color: C.bg },
  buildTxtDim: { color: C.textGhost },
  examplesBlock: { marginTop: 30 },
  examplesLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.6,
    marginBottom: 10,
    paddingLeft: 4,
  },
  exampleList: { gap: 2 },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  exampleArrow: {
    color: C.textGhost,
    fontFamily: F.mono,
    fontSize: 14,
  },
  exampleTxt: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 14,
    letterSpacing: 0.1,
    flex: 1,
  },
  fineprint: { marginTop: 26, paddingHorizontal: 4 },
  fineprintTxt: {
    color: C.textGhost,
    fontFamily: F.body,
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
});
