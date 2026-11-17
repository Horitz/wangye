"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCalendarDate } from "@/lib/locale-format";
import { calendarMonthDays, calendarWeekday, canShiftCalendarMonth, localCalendarToday, shiftCalendarDay, shiftCalendarMonth } from "@/lib/personal-plan-calendar";
import type { Locale } from "@/lib/home-store";
import type { PlanTask } from "@/lib/personal-plan-store";

const monthFormatters = {
  zh: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", timeZone: "UTC" }),
  ru: new Intl.DateTimeFormat("ru-RU", { year: "numeric", month: "long", timeZone: "UTC" }),
};
const weekdays = {
  zh: ["一", "二", "三", "四", "五", "六", "日"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
};

export function PersonalPlanCalendar({ locale, tasks, selectedDate, onSelectDate }: {
  locale: Locale;
  tasks: PlanTask[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const id = useId();
  const today = localCalendarToday();
  const [lastMonth, setMonth] = useState(() => (selectedDate || today).slice(0, 7));
  const month = selectedDate ? selectedDate.slice(0, 7) : lastMonth;
  const pendingFocus = useRef<string | null>(null);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const days = calendarMonthDays(month);
  const counts = new Map<string, { total: number; done: number }>();
  for (const task of tasks) {
    const count = counts.get(task.date) ?? { total: 0, done: 0 };
    count.total += 1;
    count.done += task.done ? 1 : 0;
    counts.set(task.date, count);
  }
  const focusDate = selectedDate.startsWith(month) ? selectedDate : today.startsWith(month) ? today : `${month}-01`;
  const monthLabel = monthFormatters[locale].format(new Date(`${month}-01T00:00:00.000Z`));

  useLayoutEffect(() => {
    const date = pendingFocus.current;
    if (!date) return;
    pendingFocus.current = null;
    cells.current.get(date)?.focus({ preventScroll: true });
  }, [month, selectedDate]);

  function select(date: string, focus = false) {
    if (focus) pendingFocus.current = date;
    setMonth(date.slice(0, 7));
    onSelectDate(date);
    if (focus && date === selectedDate) {
      pendingFocus.current = null;
      cells.current.get(date)?.focus({ preventScroll: true });
    }
  }
  function moveMonth(direction: -1 | 1) {
    select(shiftCalendarMonth(selectedDate.startsWith(month) ? selectedDate : `${month}-01`, direction));
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    let next: string;
    switch (event.key) {
      case "ArrowLeft": next = shiftCalendarDay(date, -1); break;
      case "ArrowRight": next = shiftCalendarDay(date, 1); break;
      case "ArrowUp": next = shiftCalendarDay(date, -7); break;
      case "ArrowDown": next = shiftCalendarDay(date, 7); break;
      case "Home": next = shiftCalendarDay(date, -calendarWeekday(date)); break;
      case "End": next = shiftCalendarDay(date, 6 - calendarWeekday(date)); break;
      case "PageUp": next = shiftCalendarMonth(date, event.shiftKey ? -12 : -1); break;
      case "PageDown": next = shiftCalendarMonth(date, event.shiftKey ? 12 : 1); break;
      default: return;
    }
    event.preventDefault();
    select(next, true);
  }

  return <section className="personal-plan-calendar" aria-labelledby={`${id}-month`}>
    <header className="personal-calendar-heading">
      <h4 id={`${id}-month`} aria-live="polite">{monthLabel}</h4>
      <div className="personal-calendar-navigation">
        <button type="button" className="personal-calendar-today" onClick={() => select(today)}>{t("今天", "Сегодня")}</button>
        <button type="button" className="personal-calendar-arrow" disabled={!canShiftCalendarMonth(month, -1)} aria-label={t("上个月", "Предыдущий месяц")} onClick={() => moveMonth(-1)}><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" className="personal-calendar-arrow" disabled={!canShiftCalendarMonth(month, 1)} aria-label={t("下个月", "Следующий месяц")} onClick={() => moveMonth(1)}><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
    </header>
    <div className="personal-calendar-grid-wrap">
      <div className="personal-calendar-grid" role="grid" aria-labelledby={`${id}-month`}>
        <div className="personal-calendar-week" role="row">{weekdays[locale].map(day => <div key={day} role="columnheader">{day}</div>)}</div>
        {Array.from({ length: 6 }, (_, week) => <div className="personal-calendar-week" role="row" key={week}>{days.slice(week * 7, week * 7 + 7).map((date, index) => {
          if (!date) return <div role="gridcell" key={`empty-${index}`} />;
          const count = counts.get(date);
          const selected = selectedDate === date;
          const label = `${formatCalendarDate(date, locale)}${count ? t(`，${count.total} 项，已完成 ${count.done} 项`, `, дел: ${count.total}, готово: ${count.done}`) : t("，没有安排", ", нет планов")}`;
          return <div role="gridcell" aria-selected={selected} key={date}><button type="button" ref={element => { if (element) cells.current.set(date, element); else cells.current.delete(date); }} className={`personal-calendar-day${date.startsWith(month) ? "" : " is-adjacent"}${selected ? " is-selected" : ""}`} aria-label={label} aria-current={date === today ? "date" : undefined} tabIndex={date === focusDate ? 0 : -1} onClick={() => select(date, true)} onKeyDown={event => navigate(event, date)}><span className="personal-calendar-day-number">{Number(date.slice(8))}</span>{count && <span className={`personal-calendar-count${count.done === count.total ? " is-complete" : ""}`} aria-hidden="true">{count.total}</span>}</button></div>;
        })}</div>)}
      </div>
    </div>
    <button type="button" className="personal-calendar-undated" aria-pressed={!selectedDate} onClick={() => { setMonth(month); onSelectDate(""); }}><CalendarDays size={18} aria-hidden="true" /><span>{t("未安排日期", "Без даты")}</span><span className="personal-task-tab-count">{counts.get("")?.total ?? 0}</span></button>
  </section>;
}
