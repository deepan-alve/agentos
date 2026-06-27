import { router } from 'expo-router';
import { Plus, Settings as SettingsIcon, Sparkles, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCreated, visibleCreatedApps, type CreatedApp } from '@/src/store/created';
import { C, F } from '@/src/theme/colors';
import { GeneratedIcon } from './GeneratedIcon';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(Math.floor(SCREEN_W * 0.85), 380);
const ANIM_MS = 220;

function relTime(from: number): string {
  const ms = Math.max(0, Date.now() - from);
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

export function BuildsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const apps = useCreated((s) => s.apps);
  const visible = useMemo(() => visibleCreatedApps(apps), [apps]);
  const building = useMemo(() => visible.filter((a) => a.buildStatus === 'building'), [visible]);
  const built = useMemo(
    () =>
      visible
        .filter((a) => a.buildStatus === 'built')
        .sort((a, b) => (b.builtAt ?? b.createdAt) - (a.builtAt ?? a.createdAt)),
    [visible],
  );

  const slideX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: open ? 0 : -DRAWER_W,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: open ? 1 : 0,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, slideX, backdrop]);

  const goToApp = (id: string) => {
    onClose();
    // Small delay so the drawer close animation feels intentional
    setTimeout(() => router.push(`/app/${id}`), 60);
  };

  return (
    <Modal
      transparent
      visible={open}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[styles.backdrop, { opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }) }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { width: DRAWER_W, transform: [{ translateX: slideX }] }]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerKicker} allowFontScaling={false}>
                AGENT/OS · BUILDS
              </Text>
              <Text style={styles.headerTitle} allowFontScaling={false}>
                Conjure
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <X size={20} color={C.text} strokeWidth={1.6} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {visible.length === 0 && (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Sparkles size={28} color={C.textDim} strokeWidth={1.4} />
                </View>
                <Text style={styles.emptyTitle} allowFontScaling={false}>
                  No builds yet.
                </Text>
                <Text style={styles.emptySub} allowFontScaling={false}>
                  Describe an app below.{'\n'}The agent will start building.
                </Text>
              </View>
            )}

            {building.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={styles.sectionRow}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionLabel} allowFontScaling={false}>
                    STILL BUILDING · {pad(building.length)}
                  </Text>
                </View>
                <View style={styles.list}>
                  {building.map((b) => (
                    <BuildRow key={b.id} app={b} onPress={() => goToApp(b.id)} kind="building" />
                  ))}
                </View>
              </View>
            )}

            {built.length > 0 && (
              <View style={{ marginTop: building.length > 0 ? 22 : 8 }}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel} allowFontScaling={false}>
                    RECENTLY BUILT · {pad(built.length)}
                  </Text>
                </View>
                <View style={styles.list}>
                  {built.slice(0, 8).map((b) => (
                    <BuildRow key={b.id} app={b} onPress={() => goToApp(b.id)} kind="built" />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.85 }]}
            >
              <Plus size={16} color={C.bg} strokeWidth={2.4} />
              <Text style={styles.newBtnTxt} allowFontScaling={false}>
                NEW BUILD
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                setTimeout(() => router.push('/settings'), 60);
              }}
              style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}
              hitSlop={10}
            >
              <SettingsIcon size={13} color={C.textDim} strokeWidth={1.6} />
              <Text style={styles.settingsTxt} allowFontScaling={false}>
                BACKEND SETTINGS
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function BuildRow({
  app,
  onPress,
  kind,
}: {
  app: CreatedApp;
  onPress: () => void;
  kind: 'building' | 'built';
}) {
  const dotColor =
    kind === 'building'
      ? '#FFB54C'
      : app.submission.status === 'live'
      ? '#FFD75A'
      : app.submission.status === 'approved_pending_merge'
      ? '#7CE7C7'
      : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowIcon}>
        <GeneratedIcon seed={app.id} name={app.name} size={28} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1} allowFontScaling={false}>
          {app.name}
        </Text>
        <Text style={styles.rowPrompt} numberOfLines={1} allowFontScaling={false}>
          "{app.prompt}"
        </Text>
        <View style={styles.rowMeta}>
          {dotColor !== 'transparent' && (
            <View style={[styles.rowMetaDot, { backgroundColor: dotColor }]} />
          )}
          <Text style={styles.rowMetaTxt} allowFontScaling={false}>
            {relTime(kind === 'building' ? app.buildStartedAt : app.builtAt ?? app.createdAt).toUpperCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#0a0a0a',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerKicker: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.6,
    marginBottom: 4,
  },
  headerTitle: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#FFB54C',
  },
  sectionLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.2,
  },
  list: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowName: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
  rowPrompt: {
    color: C.textDim,
    fontFamily: F.serifItalic,
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  rowMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  rowMetaTxt: {
    color: C.textGhost,
    fontFamily: F.monoBold,
    fontSize: 8,
    letterSpacing: 1.4,
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: C.text,
    fontFamily: F.serifItalic,
    fontSize: 26,
    letterSpacing: -0.6,
  },
  emptySub: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  newBtnTxt: {
    color: C.bg,
    fontFamily: F.monoBold,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  settingsBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  settingsTxt: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 1.8,
  },
});
