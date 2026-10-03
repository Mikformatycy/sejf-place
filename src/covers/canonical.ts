import { RHYTHM_TAPS, SEQUENCE_STEPS } from './sequence';

/**
 * A cover reports user actions as candidates. The canonical string of the
 * candidate (cover | action | target | value) is what the vault key is
 * derived from, so the same value typed in a different place is a different key.
 */
export type CoverId = 'przepisy' | 'zadania' | 'woda' | 'urodziny' | 'ksiazki' | 'kwiatki';

/** How the value of an action is normalized and how strong it must be. */
export type ValueKind = 'text' | 'number' | 'keys' | 'sequence' | 'rhythm';

export interface Candidate {
  action: string;
  /** What the action was applied to, e.g. "sernik/0" (recipe/ingredient), "dom" (list). */
  target?: string;
  value: string;
}

const PL_MAP: Record<string, string> = { ł: 'l', Ł: 'l' };

/** Lowercase, no Polish diacritics, single spaces. "  Mąka  ŻYTNIA " -> "maka zytnia". */
export function normalizeText(s: string): string {
  return s
    .replace(/[łŁ]/g, (c) => PL_MAP[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** "1 234,50" -> "1234.5", "0750" -> "750". */
export function normalizeNumber(s: string): string {
  let v = s.replace(/\s/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(v) || v === '' || v === '.') return v;
  if (v.includes('.')) v = v.replace(/0+$/, '').replace(/\.$/, '');
  v = v.replace(/^0+(?=\d)/, '');
  return v;
}

export function normalizeValue(kind: ValueKind, value: string): string {
  switch (kind) {
    case 'text':
      return normalizeText(value);
    case 'number':
      return normalizeNumber(value);
    case 'keys':
    case 'sequence':
    case 'rhythm':
      return value;
  }
}

export function canonicalize(cover: CoverId, kind: ValueKind, c: Candidate): string {
  return [cover, c.action, c.target ?? '', normalizeValue(kind, c.value)].join('|');
}

export interface Strength {
  ok: boolean;
  /** Short, plain-language explanation shown while recording the key. */
  message: string;
  /** Rough number of combinations an attacker would have to try. */
  combinations: number;
}

/** Minimum rules from the plan: text ≥ 8 chars, numbers ≥ 4 digits, sequences exactly 5 steps, rhythm exactly 6 taps. */
export function checkStrength(kind: ValueKind, rawValue: string, alphabetSize = 2): Strength {
  const value = normalizeValue(kind, rawValue);
  switch (kind) {
    case 'text': {
      const ok = value.replace(/ /g, '').length >= 8;
      return {
        ok,
        message: ok ? 'Dobra fraza.' : 'Za krótko: co najmniej 8 liter.',
        combinations: 27 ** Math.min(value.length, 12),
      };
    }
    case 'number':
    case 'keys': {
      const digits = value.replace(/[^0-9]/g, '').length;
      const ok = digits >= 4;
      return {
        ok,
        message: ok
          ? digits >= 6
            ? 'Dobrze.'
            : 'Może być, ale 6 cyfr jest bezpieczniej.'
          : 'Za krótko: co najmniej 4 cyfry.',
        combinations: 10 ** digits,
      };
    }
    case 'sequence': {
      const steps = value ? value.split('>').length : 0;
      const ok = steps === SEQUENCE_STEPS;
      return {
        ok,
        message: ok ? 'Dobrze.' : `Potrzeba dokładnie ${SEQUENCE_STEPS} kroków.`,
        combinations: alphabetSize ** steps,
      };
    }
    case 'rhythm': {
      const ok = value.length === RHYTHM_TAPS;
      return {
        ok,
        message: ok ? 'Dobrze.' : `Potrzeba dokładnie ${RHYTHM_TAPS} stuknięć.`,
        combinations: 2 ** value.length,
      };
    }
  }
}
