import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { StepRecorder, SEQUENCE_IDLE_MS } from '@/covers/sequence';

/** Ref that always holds the latest value (updated after render, read in callbacks). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * A StepRecorder that lives as long as the component and always calls the latest
 * `onComplete` (so it never uses a stale `check` from an earlier render).
 */
export function useStepRecorder(
  onComplete: (steps: string[], final: boolean, stop: () => void) => void,
  length?: number,
): StepRecorder {
  const latest = useLatest(onComplete);
  const [recorder] = useState(
    () => new StepRecorder((steps, final, stop) => latest.current(steps, final, stop), SEQUENCE_IDLE_MS, Date.now, length),
  );
  useEffect(() => () => recorder.cancel(), [recorder]);
  return recorder;
}

/**
 * Every cover gets this callback. It reports a user action; the promise
 * resolves to `true` when the action was the user's key and the vault opened.
 * In that case the cover must NOT apply the change (nothing is saved).
 * `partial: true` = an unfinished sequence checked after each tap: it may unlock immediately,
 * but the key recorder ignores it (it records only finished sequences).
 */
export type CheckFn = (action: string, value: string, target?: string, opts?: { partial?: boolean }) => Promise<boolean>;

export interface CoverProps {
  check: CheckFn;
}

/** Cover data is ordinary, unencrypted app data, so the cover looks genuinely used. */
export function usePersisted<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(value);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(`pb.c.${key}`).then((raw) => {
      if (!alive) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as T;
          latest.current = parsed;
          setValue(parsed);
        } catch {
          // ignore corrupted cover data
        }
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(latest.current) : next;
      latest.current = v;
      setValue(v);
      void AsyncStorage.setItem(`pb.c.${key}`, JSON.stringify(v));
    },
    [key],
  );

  return [value, update, loaded];
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Props for text inputs that may receive the user's secret phrase: no learning, no suggestions. */
export const secretSafeInput = {
  autoCorrect: false,
  autoComplete: 'off' as const,
  spellCheck: false,
  autoCapitalize: 'none' as const,
  importantForAutofill: 'no' as const,
  // Android: "visible password" disables suggestions and dictionary learning on most keyboards.
  keyboardType: 'visible-password' as const,
};
