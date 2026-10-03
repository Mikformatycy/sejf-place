import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { Accelerometer } from 'expo-sensors';

import { setLauncherCover } from '../../modules/cover-switcher';

import { takePendingCoverIcon, useSession } from './session';

/**
 * Locks the vault and shows the cover. Safe to call from anywhere, any number of times.
 * The navigation history is dropped, so "back" can never lead into the vault again.
 */
export function quickExit(): void {
  openHolds = 0;
  useSession.getState().lock();
  try {
    // Pops everything above the cover (or replaces the current screen with it).
    router.dismissTo('/');
  } catch {
    // Navigation not ready yet; the vault layout redirects on its own when locked.
  }
  void takePendingCoverIcon().then((id) => id && setLauncherCover(id));
}

// System pickers / share sheets put the app in the background on Android.
// While one is open, backgrounding must not lock the vault.
let externalDepth = 0;

export async function withExternalActivity<T>(fn: () => Promise<T>): Promise<T> {
  externalDepth++;
  try {
    return await fn();
  } finally {
    setTimeout(() => {
      externalDepth = Math.max(0, externalDepth - 1);
    }, 1500);
  }
}

// Inactivity lock. Touches alone are not enough: typing on the keyboard, a long recording
// or a pending AI request involve no touch at all and must not lock the vault mid-way.
let lastActivity = Date.now();
let openHolds = 0;

export function markActivity(): void {
  lastActivity = Date.now();
}

/** Keeps the vault from locking for inactivity until the returned release() is called. */
export function holdOpen(): () => void {
  openHolds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openHolds = Math.max(0, openHolds - 1);
    markActivity();
  };
}

const SHAKE_G = 2.3;
const SHAKE_WINDOW_MS = 900;
const DOUBLE_BACK_MS = 600;

/** Installs every automatic exit for as long as a vault screen is mounted. */
export function useVaultGuards(opts: { shakeToExit: boolean; autoLockMinutes: number }): { touch: () => void } {
  // DEMO: screenshots allowed for the pitch. Restore this line before real use.
  // ScreenCapture.usePreventScreenCapture('vault');

  // Lock when the app goes to the background (home button, app switcher, incoming call).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && externalDepth === 0) quickExit();
    });
    return () => sub.remove();
  }, []);

  // Blur the iOS app-switcher snapshot.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => undefined);
    return () => void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
  }, []);

  // Inactivity.
  useEffect(() => {
    markActivity();
    const limit = Math.max(1, opts.autoLockMinutes) * 60_000;
    const t = setInterval(() => {
      if (openHolds === 0 && Date.now() - lastActivity > limit) quickExit();
    }, 5000);
    return () => clearInterval(t);
  }, [opts.autoLockMinutes]);

  // Two strong shakes in a short window.
  useEffect(() => {
    if (!opts.shakeToExit) return;
    let firstSpike = 0;
    Accelerometer.setUpdateInterval(80);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (Math.sqrt(x * x + y * y + z * z) < SHAKE_G) return;
      const now = Date.now();
      if (now - firstSpike < SHAKE_WINDOW_MS && now - firstSpike > 120) quickExit();
      else firstSpike = now;
    });
    return () => sub.remove();
  }, [opts.shakeToExit]);

  // Android: double "back" exits immediately.
  useEffect(() => {
    let last = 0;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      if (now - last < DOUBLE_BACK_MS) {
        quickExit();
        return true;
      }
      last = now;
      return false;
    });
    return () => sub.remove();
  }, []);

  return { touch: markActivity };
}
