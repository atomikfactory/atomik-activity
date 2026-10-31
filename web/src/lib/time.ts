// The backend stores `timestamp without time zone` and returns ISO strings
// without a trailing "Z". The browser would otherwise parse them as local time.
// The mobile always sends `Date.now()` (UTC ms), so we treat every server
// timestamp as UTC by force-appending the suffix.
export function parseServerTimestamp(value: string): Date {
  if (!value) return new Date(NaN);
  const trimmed = value.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return new Date(trimmed);
  return new Date(trimmed + "Z");
}

export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIso(): string {
  return isoDay(new Date());
}

export function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return isoDay(date);
}

// Browser IANA zone (e.g. "Europe/Paris"), sent to the API so a "day" means the
// user's local calendar day rather than the UTC day.
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

// Local calendar day ("YYYY-MM-DD") of a server timestamp.
export function localDayOf(serverTimestamp: string): string {
  return isoDay(parseServerTimestamp(serverTimestamp));
}
