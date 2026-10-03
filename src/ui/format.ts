const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

/** "2026-09-12T21:30" -> "12 wrz 2026, 21:30" */
export function formatOccurred(occurredAt: string, approx = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(occurredAt);
  if (!m) return occurredAt;
  const [, y, mo, d, h, mi] = m;
  const date = `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
  return `${approx ? 'ok. ' : ''}${date}${h ? `, ${h}:${mi}` : ''}`;
}

/** ISO instant -> local "12.09.2026 21:30:05" */
export function formatInstant(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** 75 -> "01:15", 3725 -> "1:02:05" */
export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const shortHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

/** Polish plural form: plural(n, 'wpis', 'wpisy', 'wpisów'). */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const d = n % 10;
  const dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
}

/** Local "YYYY-MM-DDTHH:mm" for now. */
export function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
