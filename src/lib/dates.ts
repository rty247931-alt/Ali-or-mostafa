// The store runs on Cairo time. "From/to" report dates are interpreted as Cairo calendar days.
const TZ = "Africa/Cairo";

function offsetMs(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at.getTime();
}

/** 00:00 of the given yyyy-mm-dd in Cairo, as a UTC instant. */
export function cairoStart(d: string): Date {
  const guess = new Date(`${d}T00:00:00Z`);
  return new Date(guess.getTime() - offsetMs(guess));
}
export const cairoEnd = (d: string): Date => new Date(cairoStart(d).getTime() + 86_400_000 - 1);

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const validDay = (s: string | undefined): s is string => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // rejects 2026-02-30
};
