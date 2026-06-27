import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  useFonts as useInstrument,
} from '@expo-google-fonts/instrument-serif';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  useFonts as useJetBrains,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Manrope_500Medium,
  Manrope_700Bold,
  useFonts as useManrope,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { subscribeBuildStream, type BuildStreamHandle } from '@/src/lib/brogent-api';
import { getBrogentUrl } from '@/src/lib/build-config';
import { useCreated } from '@/src/store/created';
import { C } from '@/src/theme/colors';

export default function RootLayout() {
  const [manropeLoaded] = useManrope({ Manrope_500Medium, Manrope_700Bold });
  const [serifLoaded] = useInstrument({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });
  const [monoLoaded] = useJetBrains({ JetBrainsMono_400Regular, JetBrainsMono_500Medium });

  const ready = manropeLoaded && serifLoaded && monoLoaded;

  // Persistent auto-complete ticker. Runs once per second across the whole
  // app lifetime. Checks every CreatedApp's autoCompleteAt timestamp and
  // calls markBuilt if elapsed. Survives navigation, reloads, and even app
  // restarts (autoCompleteAt is persisted to AsyncStorage).
  useEffect(() => {
    const tick = () => {
      const { apps, markBuilt } = useCreated.getState();
      const now = Date.now();
      for (const a of apps) {
        if (a.buildStatus !== 'building') continue;
        if (!a.autoCompleteAt || !a.autoCompleteUrl) continue;
        if (now < a.autoCompleteAt) continue;
        markBuilt(a.id, a.autoCompleteUrl);
      }
    };
    tick(); // run once immediately on mount (catches overdue builds after reload)
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Background Brogent SSE subscriptions. One stream per in-flight build, kept
  // alive across navigation so progress lands even when the user isn't looking
  // at the [id] screen. The handle Map lives outside React so re-renders don't
  // tear down sockets. We rescan every 2s to pick up new builds and close
  // handles for builds that hit a terminal state.
  useEffect(() => {
    const handles = new Map<string, BuildStreamHandle>();
    const tick = () => {
      const state = useCreated.getState();
      const liveBuilds = state.apps.filter((a) => a.buildStatus === 'building');
      const liveIds = new Set(liveBuilds.map((a) => a.id));

      // close any handles whose builds are no longer 'building'
      for (const [id, h] of handles) {
        if (!liveIds.has(id)) {
          h.close();
          handles.delete(id);
        }
      }

      // open handles for any building build we haven't subscribed to yet
      for (const a of liveBuilds) {
        if (handles.has(a.id)) continue;
        // Magic-prompt apps (the demo path) auto-complete via the ticker
        // above — they have no Brogent backend, so don't try to subscribe.
        if (a.autoCompleteAt && a.autoCompleteUrl) continue;
        const handle = subscribeBuildStream({
          brogentUrl: getBrogentUrl(),
          projectId: a.id,
          lastEventId: a.lastEventId,
          callbacks: {
            onEvent: (evt) => {
              useCreated.getState().updateBuildProgress(a.id, {
                lastEventId: evt.id,
                lastStage: evt.stage,
                lastMessage: evt.message,
              });
            },
            onFinal: (f) => {
              if (f.status === 'done' && f.app_url) {
                useCreated.getState().markBuilt(a.id, f.app_url);
              } else if (f.status === 'done' && !f.app_url) {
                useCreated.getState().markFailed(
                  a.id,
                  'Build finished but no app URL was returned.',
                );
              } else {
                useCreated.getState().markFailed(
                  a.id,
                  'Build failed. Check the agent logs on the laptop.',
                );
              }
              handle.close();
              handles.delete(a.id);
            },
            onError: (err) => {
              // Network blip — leave the build in 'building' state and let
              // the next tick re-subscribe from lastEventId. Only escalate
              // to 'failed' if onFinal hasn't fired (handled inside the
              // brogent-api fallback path already).
              // eslint-disable-next-line no-console
              console.warn(`[brogent-sse] ${a.id}: ${err.kind} — ${err.message}`);
            },
          },
        });
        handles.set(a.id, handle);
      }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      clearInterval(interval);
      for (const h of handles.values()) h.close();
      handles.clear();
    };
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.bg },
            animation: 'fade',
            animationDuration: 220,
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
