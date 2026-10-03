/**
 * Colours of the vault. `C` is changed in place when the theme switches, and styles made
 * with themed() are rebuilt on next use, so screens only need to render again.
 */
const LIGHT = {
  bg: '#F6F4F1',
  surface: '#FFFFFF',
  text: '#1F2328',
  muted: '#5E6670',
  border: '#E2DDD6',
  primary: '#33507A',
  primarySoft: '#E5ECF5',
  accent: '#C4623F',
  accentSoft: '#F8E6DE',
  ok: '#2E7454',
  okSoft: '#E1F1E8',
  warn: '#9A6A12',
  warnSoft: '#FBF0D9',
  danger: '#B3261E',
  /** Buttons that send something to the AI. */
  ai: '#6A4C9C',
  aiSoft: '#EEE8F7',
  /** The "new entry" button. */
  add: '#2B7A73',
};

const DARK: typeof LIGHT = {
  bg: '#121417',
  surface: '#1C1F24',
  text: '#E6E8EB',
  muted: '#9AA3AD',
  border: '#2E333A',
  primary: '#638AC2',
  primarySoft: '#22324A',
  accent: '#E08562',
  accentSoft: '#3A2620',
  ok: '#5FB98A',
  okSoft: '#1C3328',
  warn: '#D9A441',
  warnSoft: '#3A2F17',
  danger: '#E5534B',
  ai: '#A88BDB',
  aiSoft: '#2D2540',
  add: '#3E9E95',
};

export const C = { ...LIGHT };

let dark = false;
let version = 0;

export const isDark = () => dark;

/** Returns true when the palette changed (screens have to render again). */
export function applyTheme(next: boolean): boolean {
  if (next === dark) return false;
  dark = next;
  version++;
  Object.assign(C, next ? DARK : LIGHT);
  return true;
}

/** StyleSheet that follows the theme: `const st = themed(() => StyleSheet.create({...}))`. */
export function themed<T extends object>(make: () => T): T {
  let cache = make();
  let built = version;
  return new Proxy({} as T, {
    get(_, key) {
      if (built !== version) {
        cache = make();
        built = version;
      }
      return cache[key as keyof T];
    },
  });
}
