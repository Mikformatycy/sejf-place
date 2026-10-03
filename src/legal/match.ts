/** Text matching helpers for the offline legal hints (src/legal/hints.ts). */
import type { Attachment, EntryContent, Profile, ViolenceForm } from '@/vault/types';

/** The parts of an entry the rules look at (a saved entry or the draft being written). */
export type HintEntry = Pick<
  EntryContent,
  'description' | 'forms' | 'tags' | 'injuries' | 'injuriesDescription' | 'childrenPresent' | 'witnesses'
> & { attachmentKinds: Attachment['kind'][] };

export interface HintContext {
  entry: HintEntry;
  /** Other saved entries, so repeated behaviour can be recognised. */
  history: HintEntry[];
  profile?: Pick<Profile, 'relation' | 'firearm'>;
}

const PL: Record<string, string> = { ł: 'l', Ł: 'l' };

/** Lowercase without Polish diacritics, one character per character (indexes stay valid). */
export function fold(text: string): string {
  let out = '';
  for (const ch of text) {
    const lower = (PL[ch] ?? ch).toLowerCase();
    const base = lower.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    // Keep the string length identical so a match can be quoted from the original text.
    out += base.length === ch.length ? base : lower.length === ch.length ? lower : ch;
  }
  return out;
}

const QUOTE_MAX = 90;

/** The sentence around a match, shortened to a readable quote. */
function quoteAround(text: string, at: number, len: number): string {
  let start = at;
  while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;
  let end = at + len;
  while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
  let s = text.slice(start, end).trim();
  if (s.length > QUOTE_MAX) {
    const rel = at - start;
    const from = Math.max(0, Math.min(rel - 30, s.length - QUOTE_MAX));
    s = `${from > 0 ? '…' : ''}${s.slice(from, from + QUOTE_MAX).trim()}…`;
  }
  return s;
}

/**
 * Finds the first of `stems` in the user's text and returns "Napisałaś: „…”".
 * A stem directly preceded by "nie" ("nie groził") does not count.
 */
export function findQuote(text: string, stems: string[]): string | null {
  if (!text) return null;
  const folded = fold(text);
  for (const stem of stems) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(stem, from);
      if (at < 0) break;
      const before = folded.slice(Math.max(0, at - 16), at);
      const negated = /(^|[^a-z])(nie|nigdy nie)\s+$/.test(before);
      const wordStart = at === 0 || !/[a-z0-9]/.test(folded[at - 1]);
      if (!negated && wordStart) return `Napisałaś: „${quoteAround(text, at, stem.length)}”`;
      from = at + stem.length;
    }
  }
  return null;
}

const FORM_LABEL: Record<ViolenceForm, string> = {
  fizyczna: 'fizyczna',
  psychiczna: 'psychiczna',
  seksualna: 'seksualna',
  ekonomiczna: 'ekonomiczna',
  elektroniczna: 'przez telefon / internet',
  inne: 'inna',
};

/** Helpers the rules use to explain themselves. */
export const why = {
  form(ctx: HintContext, forms: ViolenceForm[]): string | null {
    const hit = ctx.entry.forms.filter((f) => forms.includes(f));
    return hit.length ? `Zaznaczyłaś rodzaj: ${hit.map((f) => FORM_LABEL[f]).join(', ')}` : null;
  },
  tag(ctx: HintContext, tags: string[]): string | null {
    const hit = ctx.entry.tags.filter((t) => tags.includes(t));
    return hit.length ? `Zaznaczyłaś: ${hit.join(', ')}` : null;
  },
  words(ctx: HintContext, stems: string[]): string | null {
    const e = ctx.entry;
    return findQuote(e.description, stems) ?? findQuote(e.injuriesDescription, stems);
  },
  /** How many other entries share one of these forms (repeated behaviour). */
  repeated(ctx: HintContext, forms: ViolenceForm[]): string | null {
    const n = ctx.history.filter((h) => h.forms.some((f) => forms.includes(f))).length;
    return n > 0 ? `W Teczce są jeszcze ${n === 1 ? '1 podobny wpis' : `${n} podobne wpisy`}` : null;
  },
};

