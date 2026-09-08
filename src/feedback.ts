/**
 * Audio + haptic feedback ("game juice"). Everything here is best-effort and
 * wrapped so it can never crash gameplay: on web, in Expo Go without permission,
 * or if an asset fails to load, calls simply no-op.
 */

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type Sfx = "putt" | "bounce" | "splash" | "sink" | "cheer";

const SOURCES: Record<Sfx, number> = {
  putt: require("../assets/sfx/putt.wav"),
  bounce: require("../assets/sfx/bounce.wav"),
  splash: require("../assets/sfx/splash.wav"),
  sink: require("../assets/sfx/sink.wav"),
  cheer: require("../assets/sfx/cheer.wav"),
};

const sounds: Partial<Record<Sfx, Audio.Sound>> = {};
let ready = false;
let muted = false;
let lastBounce = 0;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
}

export function toggleMuted(): boolean {
  muted = !muted;
  return muted;
}

/** Preload all sound effects once at startup. Safe to call more than once. */
export async function initFeedback(): Promise<void> {
  if (ready) return;
  ready = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    await Promise.all(
      (Object.keys(SOURCES) as Sfx[]).map(async (key) => {
        try {
          const { sound } = await Audio.Sound.createAsync(SOURCES[key], {
            volume: key === "bounce" ? 0.5 : 0.9,
          });
          sounds[key] = sound;
        } catch {
          /* asset unavailable — skip */
        }
      }),
    );
  } catch {
    /* audio subsystem unavailable */
  }
}

export function play(name: Sfx): void {
  if (muted) return;
  const s = sounds[name];
  if (!s) return;
  s.replayAsync().catch(() => {});
}

// --- Haptics (silently ignored on web / unsupported devices) --------------

function safeHaptic(fn: () => Promise<unknown>): void {
  if (Platform.OS === "web") return;
  try {
    fn().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function hapticLaunch(power: number): void {
  safeHaptic(() =>
    Haptics.impactAsync(
      power > 0.7
        ? Haptics.ImpactFeedbackStyle.Heavy
        : power > 0.4
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
    ),
  );
}

/** Throttled so a bouncy ricochet doesn't machine-gun the taptic engine. */
export function hapticBounce(): void {
  const now = Date.now();
  if (now - lastBounce < 70) return;
  lastBounce = now;
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticSink(): void {
  safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticWater(): void {
  safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticTick(): void {
  safeHaptic(() => Haptics.selectionAsync());
}
