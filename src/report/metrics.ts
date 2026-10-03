import type { Entry, ReportStamp } from '@/vault/types';

/**
 * Numbers for a pilot with a support organisation ("measurable change": time from the first
 * incident to a report, how much evidence was collected). Everything is derived from what the
 * user wrote; the app tracks nothing and sends nothing. They travel only inside the package
 * the user decides to share.
 */
export interface PilotMetrics {
  note: string;
  entries: number;
  entriesWithFiles: number;
  files: number;
  stamped: number;
  /** Day of the earliest incident described (as declared by the user). */
  firstIncident: string | null;
  /** Day the first entry was saved (device clock). */
  firstEntry: string | null;
  daysFirstIncidentToReport: number | null;
  daysFirstEntryToReport: number | null;
  /** Reports or packages shared before this one. */
  previousExports: number;
}

const DAY_MS = 24 * 3600 * 1000;

/** Whole days between two "YYYY-MM-DD" dates, never negative. */
function daysBetween(from: string, to: string): number {
  const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.max(0, Math.round((utc(to) - utc(from)) / DAY_MS));
}

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function computeMetrics(entries: Entry[], previousReports: ReportStamp[], now: Date = new Date()): PilotMetrics {
  const live = entries.filter((e) => e.content);
  const incidents = live.map((e) => e.content!.occurredAt.slice(0, 10)).sort();
  const saved = entries.map((e) => localDay(new Date(e.createdAt))).sort();
  const today = localDay(now);
  return {
    note: 'Liczby do pilotażu z organizacją pomocową, wyliczone z wpisów. Aplikacja niczego nie śledzi ani nie wysyła.',
    entries: live.length,
    entriesWithFiles: live.filter((e) => e.content!.attachments.length > 0).length,
    files: live.reduce((n, e) => n + e.content!.attachments.length, 0),
    stamped: entries.filter((e) => e.tsa).length,
    firstIncident: incidents[0] ?? null,
    firstEntry: saved[0] ?? null,
    daysFirstIncidentToReport: incidents[0] ? daysBetween(incidents[0], today) : null,
    daysFirstEntryToReport: saved[0] ? daysBetween(saved[0], today) : null,
    previousExports: previousReports.length,
  };
}
