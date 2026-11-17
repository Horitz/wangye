import type { Locale } from "@/lib/home-store";

const calendarDateFormatters = {
  zh: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
  ru: new Intl.DateTimeFormat("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }),
};

/** Personal plan dates are calendar dates, not instants in the viewer's timezone. */
export function formatCalendarDate(value: string, locale: Locale): string {
  return calendarDateFormatters[locale].format(new Date(`${value}T00:00:00.000Z`));
}
