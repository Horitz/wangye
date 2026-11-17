const firstDate = "1900-01-01";
const lastDate = "9999-12-31";
const dayMilliseconds = 24 * 60 * 60 * 1000;

function utcDate(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function toCalendarDate(value: Date) {
  if (value < utcDate(firstDate)) return firstDate;
  if (value > utcDate(lastDate)) return lastDate;
  return value.toISOString().slice(0, 10);
}

/** Today follows the browser's calendar; saved dates and arithmetic remain timezone independent. */
export function localCalendarToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function shiftCalendarDay(value: string, amount: number) {
  return toCalendarDate(new Date(utcDate(value).getTime() + amount * dayMilliseconds));
}

export function shiftCalendarMonth(value: string, amount: number) {
  const date = utcDate(value);
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return toCalendarDate(first);
}

export function calendarWeekday(value: string) { return (utcDate(value).getUTCDay() + 6) % 7; }

export function calendarMonthDays(month: string): Array<string | null> {
  const first = utcDate(`${month}-01`);
  const offset = calendarWeekday(`${month}-01`);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first.getTime() + (index - offset) * dayMilliseconds);
    return date < utcDate(firstDate) || date > utcDate(lastDate) ? null : date.toISOString().slice(0, 10);
  });
}

export function canShiftCalendarMonth(month: string, direction: -1 | 1) {
  return direction < 0 ? month > firstDate.slice(0, 7) : month < lastDate.slice(0, 7);
}
