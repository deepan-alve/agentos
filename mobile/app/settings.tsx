import { router } from 'expo-router';
import { Check, ChevronLeft, RotateCcw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ImageBackground,
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

import { useBuildConfig, validateBrogentUrl } from '@/src/lib/build-config';
import { C, F } from '@/src/theme/colors';

const WALLPAPER = require('@/assets/wallpaper.jpg');
const H_PADDING = 24;

export default function SettingsScreen() {
  const brogentUrl = useBuildConfig((s) => s.brogentUrl);
  const setBrogentUrl = useBuildConfig((s) => s.setBrogentUrl);
  const resetConfig = useBuildConfig((s) => s.reset);

  const [draft, setDraft] = useState(brogentUrl);

  const trimmedDraft = draft.trim();
  const validationError = useMemo(() => validateBrogentUrl(draft), [draft]);
  const unchanged = trimmedDraft.replace(/\/+$/, '') === brogentUrl;
  const canSave = !validationError && !unchanged;

  const onSave = () => {
    if (!canSave) return;
    setBrogentUrl(draft);
    setDraft(draft.trim().replace(/\/+$/, ''));
  };

  const onReset = () => {
    resetConfig();
    setDraft(useBuildConfig.getState().brogentUrl);
  };

  return (
    <ImageBackground source={WALLPAPER} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.header, { paddingHorizontal: H_PADDING }]}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.55 }]}
              >
                <ChevronLeft size={22} color={C.textDim} strokeWidth={1.5} />
                <Text style={styles.backTxt} allowFontScaling={false}>
                  BACK
                </Text>
              </Pressable>
              <Text style={styles.kicker} allowFontScaling={false}>
                AGENT/OS · SETTINGS
              </Text>
            </View>

            <View style={styles.heroBlock}>
              <Text style={styles.kickerLabel} allowFontScaling={false}>
                SETTINGS
              </Text>
              <Text style={styles.hero} allowFontScaling={false}>
                Backend
              </Text>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel} allowFontScaling={false}>
                BROGENT URL
              </Text>
              <Text style={styles.sectionDesc} allowFontScaling={false}>
                Where the build agent runs. Find your laptop&apos;s LAN IP (look for
                192.168.x.x) and use port 3001.
              </Text>

              <View style={styles.inputCard}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="http://192.168.1.37:3001"
                  placeholderTextColor={C.textGhost}
                  style={styles.input}
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="url"
                  spellCheck={false}
                />
              </View>

              {validationError && trimmedDraft.length > 0 ? (
                <Text style={styles.errorTxt} allowFontScaling={false}>
                  {validationError}
                </Text>
              ) : null}

              <Pressable
                onPress={onSave}
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  canSave ? styles.saveBtnReady : styles.saveBtnDim,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Check
                  size={14}
                  color={canSave ? C.bg : C.textGhost}
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    styles.saveTxt,
                    canSave ? styles.saveTxtReady : styles.saveTxtDim,
                  ]}
                  allowFontScaling={false}
                >
                  SAVE
                </Text>
              </Pressable>

              <View style={styles.currentRow}>
                <Text style={styles.currentLabel} allowFontScaling={false}>
                  CURRENTLY SAVED
                </Text>
                <Text style={styles.currentVal} allowFontScaling={false}>
                  {brogentUrl}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionLabel} allowFontScaling={false}>
                RESET
              </Text>
              <Pressable
                onPress={onReset}
                style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.6 }]}
              >
                <RotateCcw size={13} color={C.textDim} strokeWidth={1.6} />
                <Text style={styles.resetTxt} allowFontScaling={false}>
                  Reset to default
                </Text>
              </Pressable>
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -6 },
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
  kickerLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.6,
  },
  hero: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -2,
  },
  section: { marginTop: 28 },
  sectionLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.6,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionDesc: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.2,
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: C.glassEdge,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 0.2,
    padding: 0,
  },
  errorTxt: {
    color: '#FFB54C',
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  saveBtnReady: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  saveBtnDim: { backgroundColor: C.glass, borderColor: C.glassEdge },
  saveTxt: { fontFamily: F.monoBold, fontSize: 10, letterSpacing: 1.8 },
  saveTxtReady: { color: C.bg },
  saveTxtDim: { color: C.textGhost },
  currentRow: {
    marginTop: 18,
    paddingHorizontal: 4,
    gap: 4,
  },
  currentLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.4,
  },
  currentVal: {
    color: C.textDim,
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginTop: 32,
    marginHorizontal: 4,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  resetTxt: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
