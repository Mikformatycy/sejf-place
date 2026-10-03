/**
 * Offline legal hints: which provisions MAY be relevant to what the user wrote.
 * Runs entirely on the phone against a closed list of provisions verified in
 * docs/research-prawny.md (src/legal/rules.ts). It never invents a provision and every
 * hint says why it was shown: a quote from her own words or what she ticked.
 */
import type { EntryContent } from '@/vault/types';

import type { HintContext, HintEntry } from './match';
import { BLUE_CARD, RULES, type HintKind } from './rules';

export type { HintContext, HintEntry } from './match';

export interface Hint {
  id: string;
  kind: HintKind;
  title: string;
  short: string;
  law: string;
  summary: string;
  reasons: string[];
  tip?: string;
  note?: string;
  helpSlug?: string;
}

const ORDER: HintKind[] = ['ochrona', 'definicja', 'karne', 'rodzinne', 'pomoc', 'dowod'];

export function legalHints(ctx: HintContext): Hint[] {
  const hints: Hint[] = [];
  for (const rule of RULES) {
    const reasons = [...new Set(rule.match(ctx).filter((r): r is string => !!r))];
    if (reasons.length === 0) continue;
    const { match: _match, ...info } = rule;
    hints.push({ ...info, reasons });
  }
  hints.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  // The Blue Card procedure is the general next step whenever anything else applies.
  if (hints.length > 0) hints.push({ ...BLUE_CARD });
  return hints;
}

export function toHintEntry(c: EntryContent): HintEntry {
  return {
    description: c.description,
    forms: c.forms,
    tags: c.tags,
    injuries: c.injuries,
    injuriesDescription: c.injuriesDescription,
    childrenPresent: c.childrenPresent,
    witnesses: c.witnesses,
    attachmentKinds: c.attachments.map((a) => a.kind),
  };
}
