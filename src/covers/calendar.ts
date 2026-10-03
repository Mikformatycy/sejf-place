/** Date arithmetic for the birthday and plant covers, on local calendar days (no time of day). */

const DAY_MS = 24 * 3600 * 1000;

/** Local midnight as a UTC-based day number, so DST changes never shift a count by one. */
function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The next birthday on or after `today`. 29 February is celebrated on 28 February in other years. */
export function nextBirthday(day: number, month: number, today: Date): Date {
  const at = (y: number) => new Date(y, month - 1, month === 2 && day === 29 && !isLeap(y) ? 28 : day);
  const thisYear = at(today.getFullYear());
  return dayNumber(thisYear) >= dayNumber(today) ? thisYear : at(today.getFullYear() + 1);
}

export function daysUntilBirthday(day: number, month: number, today: Date): number {
  return dayNumber(nextBirthday(day, month, today)) - dayNumber(today);
}

/** Age reached on the next birthday, or null when the year is unknown. */
export function ageAtNextBirthday(day: number, month: number, year: number | undefined, today: Date): number | null {
  if (!year) return null;
  return nextBirthday(day, month, today).getFullYear() - year;
}

/** True for a real calendar date (31.04 or 30.02 are not). The year is optional. */
export function isValidDate(day: number, month: number, year?: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || month < 1 || month > 12 || day < 1) return false;
  const y = year ?? 2024; // a leap year, so 29.02 is allowed without a year
  return new Date(y, month - 1, day).getDate() === day;
}

/** "2026-10-03" for a local date. */
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Days until the next watering: negative when overdue, 0 when due today. */
export function daysUntilWatering(lastWatered: string, everyDays: number, today: Date): number {
  const [y, m, d] = lastWatered.split('-').map(Number);
  return dayNumber(new Date(y, m - 1, d)) + everyDays - dayNumber(today);
}
