/** Formats a Date as local time with its UTC offset, e.g. `2026-10-30T08:05:09-05:00`. */
export function toIsoWithOffset(date: Date): string {
  const pad = (n: number, width = 2) => String(Math.trunc(Math.abs(n))).padStart(width, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const local =
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${local}${sign}${pad(offsetMinutes / 60)}:${pad(offsetMinutes % 60)}`;
}
