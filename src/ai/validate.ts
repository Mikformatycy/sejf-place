/**
 * Guards against the model inventing facts. Every AI sentence must point to existing
 * entries, and every number in it (dates, amounts, times) must occur in those entries.
 * Anything suspicious is flagged for the user; nothing is silently accepted.
 */
export interface SourceEntry {
  id: string;
  date: string;
  description: string;
}

export interface AiItemIn {
  entryIds: string[];
  text: string;
}

export interface CheckedItem extends AiItemIn {
  flags: string[];
}

const MONTHS = ['stycz', 'lut', 'mar', 'kwie', 'maj', 'czerw', 'lip', 'sierp', 'wrze', 'paźdz', 'listop', 'grud'];

/** Numbers as written, without leading zeros: "09:05 o 1 500 zł" -> ["9","5","1","500"]. */
export function numbersIn(text: string): string[] {
  return (text.match(/\d+/g) ?? []).map((n) => n.replace(/^0+(?=\d)/, ''));
}

/** Numbers a date like "2026-09-12T21:30" may legitimately produce in prose. */
function dateNumbers(date: string): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(date);
  if (!m) return [];
  return m.slice(1).filter(Boolean).map((n) => n.replace(/^0+(?=\d)/, ''));
}

function monthOf(date: string): number | null {
  const m = /^\d{4}-(\d{2})/.exec(date);
  return m ? Number(m[1]) - 1 : null;
}

export function checkItems(items: AiItemIn[], sources: SourceEntry[]): CheckedItem[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return items.map((item) => {
    const flags: string[] = [];
    const refs = item.entryIds.map((id) => byId.get(id)).filter((s): s is SourceEntry => !!s);
    if (item.entryIds.length === 0) flags.push('Brak wskazania, z którego wpisu pochodzi to zdanie.');
    if (refs.length !== item.entryIds.length) flags.push('Odwołanie do wpisu, którego nie wysłano.');

    const allowed = new Set(refs.flatMap((r) => [...numbersIn(r.description), ...dateNumbers(r.date)]));
    const invented = numbersIn(item.text).filter((n) => !allowed.has(n));
    if (invented.length) flags.push(`Liczby, których nie ma we wpisach: ${[...new Set(invented)].join(', ')}.`);

    const lower = item.text.toLowerCase();
    const allowedMonths = new Set(refs.map((r) => monthOf(r.date)).filter((m): m is number => m !== null));
    const sourceText = refs.map((r) => r.description.toLowerCase()).join(' ');
    MONTHS.forEach((stem, i) => {
      if (lower.includes(stem) && !allowedMonths.has(i) && !sourceText.includes(stem)) {
        flags.push('Miesiąc, który nie wynika z dat wpisów.');
      }
    });
    return { ...item, flags: [...new Set(flags)] };
  });
}
