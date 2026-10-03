import type { EntryContent, MoneyAmount } from '@/vault/types';

/**
 * Details of the "Ekonomiczna" form that can come with an amount (money withheld or taken,
 * a debt, the value of what was destroyed). Ticking one shows an optional amount field.
 */
export const AMOUNT_TAGS = [
  'odmowa pieniędzy',
  'zabieranie pieniędzy lub karty',
  'dług zaciągnięty bez zgody',
  'niełożenie na utrzymanie',
  'niszczenie rzeczy osobistych',
  'demolowanie mieszkania',
  'wynoszenie lub sprzedawanie sprzętów domowych',
];

export const takesAmount = (tag: string) => AMOUNT_TAGS.includes(tag);

/** The first version (3.10) stored one {kind, amount} per entry; kept readable for its entries. */
const LEGACY_KIND: Record<string, string> = {
  odmowa: 'odmowa pieniędzy',
  zabranie: 'zabieranie pieniędzy lub karty',
  dlug: 'dług zaciągnięty bez zgody',
  utrzymanie: 'niełożenie na utrzymanie',
  inne: 'inne',
};

/** Amounts of an entry, whichever version saved it. */
export function moneyAmounts(c: Pick<EntryContent, 'amounts' | 'money'>): MoneyAmount[] {
  if (c.amounts) return c.amounts;
  const m = c.money;
  return m && m.amount !== null ? [{ tag: LEGACY_KIND[m.kind] ?? m.kind, amount: m.amount, currency: m.currency }] : [];
}

export const amountTotal = (items: MoneyAmount[]) => items.filter((a) => a.currency === 'PLN').reduce((n, a) => n + a.amount, 0);

/** "1 250,50" / "1250.5" / "800 zł" -> grosze; null for an empty field; NaN when it is not an amount. */
export function parseAmount(text: string): number | null {
  const t = text.replace(/zł|pln/gi, '').replace(/[\s ]/g, '').replace(',', '.');
  if (!t) return null;
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return NaN;
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}

/** 125050 -> "1 250,50 zł" (non-breaking spaces, so it never wraps mid-number). */
export function formatAmount(grosze: number, currency = 'PLN'): string {
  const zl = Math.floor(grosze / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const gr = String(grosze % 100).padStart(2, '0');
  return `${zl},${gr} ${currency === 'PLN' ? 'zł' : currency}`;
}

/** Amount as typed in the form ("1250,50"), the inverse of parseAmount. */
export const amountField = (grosze: number) => `${Math.floor(grosze / 100)}${grosze % 100 ? `,${String(grosze % 100).padStart(2, '0')}` : ''}`;

/** A ticked detail with its amount, if she gave one: "odmowa pieniędzy: 800,00 zł". */
export const tagText = (tag: string, items: MoneyAmount[]) => {
  const a = items.find((x) => x.tag === tag);
  return a ? `${tag}: ${formatAmount(a.amount, a.currency)}` : tag;
};
