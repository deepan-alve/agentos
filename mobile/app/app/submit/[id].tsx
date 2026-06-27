import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUp, Check, ChevronLeft, CircleAlert, ExternalLink, Sparkles, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeneratedIcon, seedToAccent } from '@/src/components/GeneratedIcon';
import { CATEGORIES } from '@/src/data/catalog';
import { submitToStore } from '@/src/lib/submit-api';
import { useCreated } from '@/src/store/created';
import { useIdentity } from '@/src/store/identity';
import { C, F } from '@/src/theme/colors';

const WALLPAPER = require('@/assets/wallpaper.jpg');
const H_PADDING = 24;

type Phase = 'form' | 'submitting' | 'approved' | 'rejected' | 'error';

export default function SubmitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useCreated((s) => s.apps.find((x) => x.id === id));
  const updateSubmission = useCreated((s) => s.updateSubmission);
  const hideApp = useCreated((s) => s.hideApp);
  const handle = useIdentity((s) => s.handle);

  const [name, setName] = useState(app?.name ?? '');
  const [tagline, setTagline] = useState(app?.submission.proposedTagline ?? '');
  const [category, setCategory] = useState<string>(
    app?.submission.proposedCategory ?? 'misc',
  );
  const [phase, setPhase] = useState<Phase>('form');
  const [result, setResult] = useState<{
    score?: number;
    feedback?: string;
    submissionId?: string;
    prUrl?: string;
  } | null>(null);

  const canSubmit =
    phase === 'form' && name.trim().length >= 2 && tagline.trim().length >= 6;

  if (!app) {
    return (
      <SafeAreaView style={[styles.bg, { backgroundColor: C.bg }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerSide} hitSlop={12}>
            <X size={22} color={C.text} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Not found</Text>
          <View style={styles.headerSide} />
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    setPhase('submitting');
    updateSubmission(app.id, {
      status: 'submitting',
      proposedTagline: tagline.trim(),
      proposedCategory: category,
    });

    try {
      const res = await submitToStore({
        appId: app.id,
        name: name.trim(),
        tagline: tagline.trim(),
        category,
        prompt: app.prompt,
        url: app.url,
        submittedBy: handle,
      });

      setResult(res);
      if (res.status === 'approved') {
        updateSubmission(app.id, {
          status: 'approved_pending_merge',
          score: res.score,
          submissionId: res.submissionId,
          prUrl: res.prUrl,
        });
        setPhase('approved');
      } else {
        updateSubmission(app.id, {
          status: 'rejected',
          score: res.score,
          feedback: res.feedback,
          submissionId: res.submissionId,
        });
        // Don't auto-hide — keep the app visible with a red badge so the
        // user can iterate or retry. Long-press the tile to remove manually.
        setPhase('rejected');
      }
    } catch (e) {
      setPhase('error');
      updateSubmission(app.id, { status: 'not_submitted' });
    }
  };

  return (
    <ImageBackground source={WALLPAPER} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerSide, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <X size={22} color={C.text} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerKicker} allowFontScaling={false}>
            AGENT/OS · SUBMIT
          </Text>
          <View style={styles.headerSide} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {phase === 'form' && (
              <FormBody
                appId={app.id}
                appName={app.name}
                prompt={app.prompt}
                handle={handle}
                name={name}
                tagline={tagline}
                category={category}
                onChangeName={setName}
                onChangeTagline={setTagline}
                onChangeCategory={setCategory}
                onSubmit={onSubmit}
                canSubmit={canSubmit}
              />
            )}

            {phase === 'submitting' && <SubmittingBody appName={app.name} />}

            {phase === 'approved' && (
              <ApprovedBody
                appName={app.name}
                appId={app.id}
                score={result?.score}
                submissionId={result?.submissionId}
                prUrl={result?.prUrl}
                onClose={() => router.back()}
              />
            )}

            {phase === 'rejected' && (
              <RejectedBody
                appName={app.name}
                appId={app.id}
                feedback={result?.feedback}
                score={result?.score}
                onIterate={() => {
                  // Bounce to create with feedback pre-filled in the prompt (future)
                  router.back();
                  // TODO: navigate to /app/create with prompt + feedback once create is wired
                }}
                onClose={() => router.back()}
              />
            )}

            {phase === 'error' && (
              <ErrorBody onRetry={() => setPhase('form')} onClose={() => router.back()} />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function FormBody({
  appId,
  appName,
  prompt,
  handle,
  name,
  tagline,
  category,
  onChangeName,
  onChangeTagline,
  onChangeCategory,
  onSubmit,
  canSubmit,
}: {
  appId: string;
  appName: string;
  prompt: string;
  handle: string;
  name: string;
  tagline: string;
  category: string;
  onChangeName: (v: string) => void;
  onChangeTagline: (v: string) => void;
  onChangeCategory: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const accent = seedToAccent(appId);
  return (
    <View>
      <View style={styles.heroBlock}>
        <View style={[styles.heroIcon]}>
          <GeneratedIcon seed={appId} name={appName} size={48} />
        </View>
        <Text style={styles.heroTitle} allowFontScaling={false}>
          Submit to{'\n'}
          <Text style={[styles.heroTitleSerif, { color: accent }]}>Store</Text>
        </Text>
        <Text style={styles.heroSub} allowFontScaling={false}>
          the agent will review for design + function.{'\n'}
          approved apps open a PR to the public catalog.
        </Text>
      </View>

      <View style={styles.bylineRow}>
        <Text style={styles.bylineLabel} allowFontScaling={false}>
          SUBMITTING AS
        </Text>
        <Text style={styles.bylineHandle} allowFontScaling={false}>
          @{handle}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.fieldLabel} allowFontScaling={false}>
          NAME
        </Text>
        <View style={styles.fieldBox}>
          <TextInput
            value={name}
            onChangeText={onChangeName}
            placeholder="App name"
            placeholderTextColor={C.textGhost}
            style={styles.fieldInput}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={28}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.fieldLabel} allowFontScaling={false}>
          TAGLINE
        </Text>
        <View style={styles.fieldBox}>
          <TextInput
            value={tagline}
            onChangeText={onChangeTagline}
            placeholder="One short sentence about what it does"
            placeholderTextColor={C.textGhost}
            style={[styles.fieldInput, { minHeight: 50 }]}
            multiline
            autoCapitalize="sentences"
            maxLength={90}
          />
          <Text style={styles.fieldHint} allowFontScaling={false}>
            {tagline.length} / 90
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.fieldLabel} allowFontScaling={false}>
          CATEGORY
        </Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <Pressable
                key={c.id}
                onPress={() => onChangeCategory(c.id)}
                style={({ pressed }) => [
                  styles.catChip,
                  active && styles.catChipActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text
                  style={[styles.catTxt, active && styles.catTxtActive]}
                  allowFontScaling={false}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.fieldLabel} allowFontScaling={false}>
          PROMPT (READ-ONLY)
        </Text>
        <View style={styles.promptBox}>
          <Text style={styles.promptTxt} allowFontScaling={false}>
            "{prompt}"
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.cta,
          canSubmit ? styles.ctaReady : styles.ctaDim,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.ctaTxt, canSubmit ? styles.ctaTxtReady : styles.ctaTxtDim]} allowFontScaling={false}>
          SUBMIT FOR REVIEW
        </Text>
        <ArrowUp
          size={16}
          color={canSubmit ? C.bg : C.textGhost}
          strokeWidth={2.5}
        />
      </Pressable>

      <Text style={styles.disclaimer} allowFontScaling={false}>
        the agent runs a visual + functional check.{'  '}
        if approved, a PR is opened in your name.{'  '}
        rejected apps are hidden — you can iterate and try again.
      </Text>
    </View>
  );
}

function SubmittingBody({ appName }: { appName: string }) {
  return (
    <View style={styles.phaseCenter}>
      <ActivityIndicator color={C.text} size="small" />
      <Text style={styles.phaseKicker} allowFontScaling={false}>
        AGENT REVIEWING
      </Text>
      <Text style={styles.phaseTitle} allowFontScaling={false}>
        Reviewing{' '}
        <Text style={styles.phaseTitleItalic}>{appName}</Text>
      </Text>
      <Text style={styles.phaseSub} allowFontScaling={false}>
        running visual + functional checks.{'\n'}
        usually 30 seconds.
      </Text>
    </View>
  );
}

function ApprovedBody({
  appName,
  appId,
  score,
  submissionId,
  prUrl,
  onClose,
}: {
  appName: string;
  appId: string;
  score?: number;
  submissionId?: string;
  prUrl?: string;
  onClose: () => void;
}) {
  const openPr = () => {
    if (prUrl) Linking.openURL(prUrl);
  };
  return (
    <View style={styles.phaseCenter}>
      <View style={[styles.phaseIcon, { backgroundColor: 'rgba(124,231,199,0.10)', borderColor: 'rgba(124,231,199,0.35)' }]}>
        <Check size={36} color="#7CE7C7" strokeWidth={1.8} />
      </View>
      <Text style={[styles.phaseKicker, { color: '#7CE7C7' }]} allowFontScaling={false}>
        APPROVED
      </Text>
      <Text style={styles.phaseTitle} allowFontScaling={false}>
        <Text style={styles.phaseTitleItalic}>{appName}</Text>{' '}
        passed review
      </Text>
      <Text style={styles.phaseSub} allowFontScaling={false}>
        {score !== undefined ? `Score ${score.toFixed(1)} / 10 · ` : ''}
        PR opened against the public catalog. once merged, it appears in everyone's store.
      </Text>
      {submissionId && (
        <Text style={styles.phaseMeta} allowFontScaling={false}>
          REF · {submissionId}
        </Text>
      )}

      {prUrl && (
        <Pressable
          onPress={openPr}
          style={({ pressed }) => [styles.cta, styles.ctaReady, pressed && { opacity: 0.85 }]}
        >
          <ExternalLink size={14} color={C.bg} strokeWidth={2} />
          <Text style={[styles.ctaTxt, styles.ctaTxtReady]} allowFontScaling={false}>
            VIEW PR ON GITHUB
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [
          prUrl ? styles.ctaGhost : styles.cta,
          !prUrl && styles.ctaReady,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text
          style={[
            prUrl ? styles.ctaGhostTxt : styles.ctaTxt,
            !prUrl && styles.ctaTxtReady,
          ]}
          allowFontScaling={false}
        >
          DONE
        </Text>
      </Pressable>
    </View>
  );
}

function RejectedBody({
  appName,
  appId,
  feedback,
  score,
  onIterate,
  onClose,
}: {
  appName: string;
  appId: string;
  feedback?: string;
  score?: number;
  onIterate: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.phaseCenter}>
      <View style={[styles.phaseIcon, { backgroundColor: 'rgba(255,92,92,0.10)', borderColor: 'rgba(255,92,92,0.35)' }]}>
        <CircleAlert size={36} color="#FF8A8A" strokeWidth={1.6} />
      </View>
      <Text style={[styles.phaseKicker, { color: '#FF8A8A' }]} allowFontScaling={false}>
        NEEDS WORK
      </Text>
      <Text style={styles.phaseTitle} allowFontScaling={false}>
        <Text style={styles.phaseTitleItalic}>{appName}</Text>{' '}
        didn't pass
      </Text>
      {score !== undefined && (
        <Text style={styles.phaseMeta} allowFontScaling={false}>
          SCORE · {score.toFixed(1)} / 10
        </Text>
      )}
      {feedback && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackLabel} allowFontScaling={false}>
            AGENT FEEDBACK
          </Text>
          <Text style={styles.feedbackTxt} allowFontScaling={false}>
            {feedback}
          </Text>
        </View>
      )}
      <Text style={styles.phaseSub} allowFontScaling={false}>
        the app is hidden from your home for now. iterate and resubmit when ready.
      </Text>
      <View style={styles.ctaRow}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.ctaGhost, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.ctaGhostTxt} allowFontScaling={false}>
            CLOSE
          </Text>
        </Pressable>
        <Pressable
          onPress={onIterate}
          style={({ pressed }) => [styles.cta, styles.ctaReady, pressed && { opacity: 0.85 }]}
        >
          <Sparkles size={14} color={C.bg} strokeWidth={2} />
          <Text style={[styles.ctaTxt, styles.ctaTxtReady]} allowFontScaling={false}>
            ITERATE
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ErrorBody({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <View style={styles.phaseCenter}>
      <View style={[styles.phaseIcon, { backgroundColor: 'rgba(255,184,76,0.10)', borderColor: 'rgba(255,184,76,0.35)' }]}>
        <CircleAlert size={36} color="#FFB54C" strokeWidth={1.6} />
      </View>
      <Text style={[styles.phaseKicker, { color: '#FFB54C' }]} allowFontScaling={false}>
        SUBMISSION FAILED
      </Text>
      <Text style={styles.phaseTitle} allowFontScaling={false}>
        Something interrupted the submission.
      </Text>
      <View style={styles.ctaRow}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.ctaGhost, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.ctaGhostTxt} allowFontScaling={false}>
            CLOSE
          </Text>
        </Pressable>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.cta, styles.ctaReady, pressed && { opacity: 0.85 }]}
        >
          <Text style={[styles.ctaTxt, styles.ctaTxtReady]} allowFontScaling={false}>
            TRY AGAIN
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.40)' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerSide: { width: 32, alignItems: 'center' },
  headerKicker: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.6,
  },
  headerTitle: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 15,
  },
  heroBlock: {
    marginTop: 8,
    alignItems: 'flex-start',
    gap: 16,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: C.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  heroTitleSerif: {
    fontFamily: F.serifItalic,
    fontSize: 42,
    letterSpacing: -1.6,
  },
  heroSub: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13.5,
    lineHeight: 20,
    letterSpacing: 0.2,
    marginTop: -4,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    paddingHorizontal: 4,
  },
  bylineLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.4,
  },
  bylineHandle: {
    color: C.text,
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  section: {
    marginTop: 18,
  },
  fieldLabel: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2.4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  fieldBox: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: C.glassEdge,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  fieldInput: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
    textAlignVertical: 'top',
  },
  fieldHint: {
    color: C.textGhost,
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 6,
    textAlign: 'right',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
  },
  catChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  catTxt: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  catTxtActive: { color: C.bg },
  promptBox: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: C.divider,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  promptTxt: {
    color: C.textDim,
    fontFamily: F.serifItalic,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  cta: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ctaReady: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  ctaDim: { backgroundColor: C.glass, borderColor: C.glassEdge },
  ctaTxt: { fontFamily: F.monoBold, fontSize: 12, letterSpacing: 2 },
  ctaTxtReady: { color: C.bg },
  ctaTxtDim: { color: C.textGhost },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    alignSelf: 'stretch',
  },
  ctaGhost: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.glassEdge,
    backgroundColor: C.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGhostTxt: {
    color: C.textDim,
    fontFamily: F.monoBold,
    fontSize: 12,
    letterSpacing: 2,
  },
  disclaimer: {
    color: C.textGhost,
    fontFamily: F.body,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 0.1,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  phaseCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 60,
    gap: 12,
  },
  phaseIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  phaseKicker: {
    color: C.textMute,
    fontFamily: F.monoBold,
    fontSize: 10,
    letterSpacing: 2.4,
    marginTop: 4,
  },
  phaseTitle: {
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 24,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  phaseTitleItalic: {
    fontFamily: F.serifItalic,
    fontSize: 26,
    letterSpacing: -1,
  },
  phaseSub: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  phaseMeta: {
    color: C.textGhost,
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    marginTop: 2,
  },
  feedbackBox: {
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: 'rgba(255,138,138,0.06)',
    borderColor: 'rgba(255,138,138,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  feedbackLabel: {
    color: '#FF8A8A',
    fontFamily: F.monoBold,
    fontSize: 9,
    letterSpacing: 2,
  },
  feedbackTxt: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
});
