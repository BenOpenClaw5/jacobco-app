// Pay periods: 14-day cycles, Tuesday through Monday
// Anchor: April 6, 2026 (Monday) = END of a completed pay period

const ANCHOR_END = new Date(2026, 3, 6); // April 6, 2026 (month is 0-indexed)

function localDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export interface PayPeriod {
  start: Date; // Tuesday
  end: Date;   // Monday (13 days after start)
}

/** Returns the start (Tuesday) of the pay period that contains `date`. */
function periodStartFor(date: Date): Date {
  const anchorStart = addDays(ANCHOR_END, -13); // March 24, 2026
  const d = localDate(date);
  const diffDays = Math.floor((d.getTime() - anchorStart.getTime()) / 86_400_000);
  const idx = Math.floor(diffDays / 14);
  return addDays(anchorStart, idx * 14);
}

/**
 * Returns the most recently COMPLETED pay period.
 * "Completed" means the Monday end-date has passed.
 */
export function getMostRecentCompletedPeriod(): PayPeriod {
  const today = localDate(new Date());
  const start = periodStartFor(today);
  const end = addDays(start, 13);
  // If today is before or equal to end, current period is ongoing → return previous
  if (today <= end && today >= start) {
    const ps = addDays(start, -14);
    return { start: ps, end: addDays(ps, 13) };
  }
  return { start, end };
}

/**
 * Returns the last `count` completed pay periods, newest first.
 */
export function getRecentPayPeriods(count = 10): PayPeriod[] {
  const base = getMostRecentCompletedPeriod();
  return Array.from({ length: count }, (_, i) => ({
    start: addDays(base.start, -i * 14),
    end: addDays(base.end, -i * 14),
  }));
}

const LONG: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
const SHORT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

export function formatPeriodLong(p: PayPeriod): string {
  return `${p.start.toLocaleDateString('en-US', LONG)} – ${p.end.toLocaleDateString('en-US', LONG)}`;
}

export function formatPeriodShort(p: PayPeriod): string {
  return `${p.start.toLocaleDateString('en-US', SHORT)} – ${p.end.toLocaleDateString('en-US', { ...SHORT, year: 'numeric' })}`;
}

/** Submission due: Wednesday after the period ends (period ends Monday → +2 days) */
export function getDueDate(p: PayPeriod): Date {
  return addDays(p.end, 2);
}

export function formatDueDate(p: PayPeriod): string {
  return getDueDate(p).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/** YYYY-MM-DD string */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as local date */
export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
