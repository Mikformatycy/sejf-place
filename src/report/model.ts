import { FORMS } from '@/content/formy';
import { moneyAmounts } from '@/content/pieniadze';
import { verifyChain, type ChainCheck } from '@/integrity/chain';
import type { Entry, Profile, ViolenceForm } from '@/vault/types';

export interface AiItem {
  entryIds: string[];
  text: string;
}

export interface AiSummary {
  createdAt: string;
  model: string;
  items: AiItem[];
}

export type LiveEntry = Entry & { content: NonNullable<Entry['content']> };

/** Deterministic report structure. Nothing here is inferred: it only groups what the user entered. */
export interface ReportModel {
  generatedAt: string;
  entries: LiveEntry[];
  deleted: Entry[];
  byForm: { form: ViolenceForm; label: string; seqs: number[] }[];
  history: {
    first: LiveEntry | null;
    firstMarked: boolean;
    repeated: { label: string; seqs: number[] }[];
    last: LiveEntry | null;
  };
  /** Per detail she gave amounts for: entries and the sum she typed (grosze, PLN). */
  money: { label: string; count: number; total: number }[];
  counts: { injuries: number; childrenPresent: number; withWitnesses: number; attachments: number; stamped: number };
  chain: { ok: boolean; checks: ChainCheck[]; headHash: string };
  profile: Profile;
  ai?: AiSummary;
}

/**
 * Only what she typed is added up. An entry that was later corrected is left out, so the
 * correction replaces it instead of counting the same money twice.
 */
export function moneySummary(entries: LiveEntry[]): ReportModel['money'] {
  const corrected = new Set(entries.map((e) => e.content.correctionOf).filter(Boolean));
  const items = entries.filter((e) => !corrected.has(e.id)).flatMap((e) => moneyAmounts(e.content)).filter((x) => x.currency === 'PLN');
  return [...new Set(items.map((x) => x.tag))].map((label) => {
    const of = items.filter((x) => x.tag === label);
    return { label, count: of.length, total: of.reduce((n, x) => n + x.amount, 0) };
  });
}

const byOccurred = (a: LiveEntry, b: LiveEntry) => a.content.occurredAt.localeCompare(b.content.occurredAt) || a.seq - b.seq;

export async function buildReportModel(
  allEntries: Entry[],
  profile: Profile,
  ai?: AiSummary,
  now: Date = new Date(),
): Promise<ReportModel> {
  const entries = allEntries.filter((e): e is LiveEntry => e.content !== null).sort(byOccurred);
  const deleted = allEntries.filter((e) => e.content === null);

  const byForm = FORMS.map((f) => ({
    form: f.id,
    label: f.nkLabel,
    seqs: entries.filter((e) => e.content.forms.includes(f.id)).map((e) => e.seq),
  })).filter((g) => g.seqs.length > 0);

  const markedFirst = entries.find((e) => e.content.isFirst) ?? null;
  const checks = await verifyChain(allEntries);

  return {
    generatedAt: now.toISOString(),
    entries,
    deleted,
    byForm,
    history: {
      first: markedFirst ?? entries[0] ?? null,
      firstMarked: markedFirst !== null,
      repeated: byForm.filter((g) => g.seqs.length >= 2).map((g) => ({ label: g.label, seqs: g.seqs })),
      last: entries[entries.length - 1] ?? null,
    },
    money: moneySummary(entries),
    counts: {
      injuries: entries.filter((e) => e.content.injuries === true).length,
      childrenPresent: entries.filter((e) => e.content.childrenPresent === true).length,
      withWitnesses: entries.filter((e) => e.content.witnesses.trim() !== '').length,
      attachments: entries.reduce((n, e) => n + e.content.attachments.length, 0),
      stamped: allEntries.filter((e) => e.tsa).length,
    },
    chain: {
      ok: checks.every((c) => c.status === 'ok' || c.status === 'deleted'),
      checks,
      headHash: allEntries[allEntries.length - 1]?.hash ?? '',
    },
    profile,
    ai,
  };
}
