"use client";

import { useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { BookOpen, CalendarDays, CheckCheck, ChevronDown, ClipboardCheck, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { FrameCreature } from "@/components/frame-creature";
import { EssentialsDialog } from "@/components/essentials-content";
import { PublishedStepDetails } from "@/components/published-step-details";
import { PersonalPlanCalendar } from "@/components/personal-plan-calendar";
import type { EditorialDocument } from "@/data/editorial-content";
import type { LocalizedText } from "@/data/home-content";
import { useEditorialDocument } from "@/lib/editorial-store";
import { useHomeState, type Locale } from "@/lib/home-store";
import { formatCalendarDate } from "@/lib/locale-format";
import { localCalendarToday } from "@/lib/personal-plan-calendar";
import { clearRecoveredPlanDraft, deletePlanTask, savePlanTask, togglePlanTask, usePersonalPlan, type PlanGroup, type PlanTask } from "@/lib/personal-plan-store";
import "@/app/personal-task-board.css";

type TaskFilter = "pending" | "completed" | "all";
type TaskDraft = { id?: string; title: LocalizedText; date: string; note: string };
type Editor = { groupId: string; draft?: TaskDraft; recovered?: boolean; key: number };
type GroupProps = {
  group: PlanGroup; locale: Locale; filter: TaskFilter;
  onEdit: (groupId: string, task: PlanTask | undefined, trigger: HTMLElement) => void;
  onToggle: (groupId: string, task: PlanTask, trigger: HTMLInputElement) => void;
  onDelete: (groupId: string, task: PlanTask, trigger: HTMLButtonElement) => void;
};

function PersonalTaskEditor({ editor, locale, onClose }: { editor: Editor; locale: Locale; onClose: (saved: boolean, date?: string) => void }) {
  const id = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const originalTitle = useRef(editor.draft?.title);
  const [title, setTitle] = useState(editor.draft?.title[locale] ?? "");
  const [note, setNote] = useState(editor.draft?.note ?? "");
  const [error, setError] = useState<"title" | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const titleChanged = useRef(false);
  useLayoutEffect(() => { nameInput.current?.focus(); }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError("title"); nameInput.current?.focus(); return; }
    const date = String(new FormData(event.currentTarget).get("date") ?? "");
    savePlanTask(editor.groupId, { id: editor.draft?.id, title: !titleChanged.current && originalTitle.current ? originalTitle.current : { zh: trimmedTitle, ru: trimmedTitle }, date, note: note.trim() });
    if (editor.recovered) clearRecoveredPlanDraft();
    onClose(true, date);
  }
  return <form className="personal-plan-editor material-glass" onSubmit={submit} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(false); } }}>
    <h4>{editor.draft?.id ? t("编辑我的安排", "Изменить мой план") : t("添加我的安排", "Добавить мой план")}</h4>
    <div className="personal-plan-editor-fields">
      <label htmlFor={`${id}-title`}>{t("事项名称", "Название дела")}<input id={`${id}-title`} ref={nameInput} value={title} maxLength={160} required onChange={event => { titleChanged.current = true; setTitle(event.target.value); }} /></label>
      <label htmlFor={`${id}-date`}>{t("日期（选填）", "Дата (необязательно)")}<input id={`${id}-date`} name="date" type="date" defaultValue={editor.draft?.date ?? ""} min="1900-01-01" max="9999-12-31" /></label>
      <label className="personal-plan-note-field" htmlFor={`${id}-note`}>{t("我的备注", "Моя заметка")}<textarea id={`${id}-note`} rows={3} maxLength={4000} value={note} onChange={event => setNote(event.target.value)} /></label>
    </div>
    {error && <p role="alert" className="personal-plan-error">{t("请填写事项名称。", "Введите название дела.")}</p>}
    <div className="personal-plan-editor-actions"><button className="button primary" type="submit">{t("保存安排", "Сохранить")}</button><button className="button secondary" type="button" onClick={() => onClose(false)}>{t("取消", "Отмена")}</button></div>
  </form>;
}

function PlanSourceStatus({ locale, loading, error, onRetry }: { locale: Locale; loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const pendingFocus = useRef<{ trigger: HTMLElement; summary: HTMLElement | null } | null>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  useLayoutEffect(() => {
    if (loading) return;
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (pending && !pending.trigger.isConnected && document.activeElement === document.body) pending.summary?.focus({ preventScroll: true });
  }, [loading, error]);
  if (!loading && !error) return null;
  return <div className="personal-plan-retry"><p role="status" className={error && !loading ? "personal-plan-error" : undefined}>{loading ? t("正在读取材料与地点…", "Загружаем документы и место…") : t("暂时无法读取最新内容。", "Не удалось загрузить актуальные сведения.")}</p>{error && <button type="button" className="button secondary" disabled={loading} onClick={event => { pendingFocus.current = { trigger: event.currentTarget, summary: event.currentTarget.closest("details")?.querySelector("summary") ?? null }; onRetry?.(); }}>{loading ? t("正在读取…", "Загружаем…") : t("重新读取", "Повторить")}</button>}</div>;
}

function PlanGroupRows({ group, locale, filter, onEdit, onToggle, onDelete, content, loading, error, onRetry }: GroupProps & { content?: EditorialDocument; loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const id = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const visible = group.tasks.filter(task => filter === "all" || task.done === (filter === "completed"));
  if (!visible.length && filter !== "all") return null;
  return <section className="personal-plan-group" aria-labelledby={`${id}-title`}>
    <header className="personal-plan-group-heading"><h4 id={`${id}-title`}>{content?.title[locale] ?? group.title[locale]}</h4><button type="button" className="personal-plan-add" onClick={event => onEdit(group.id, undefined, event.currentTarget)}><Plus size={17} aria-hidden="true" />{t("添加任务", "Добавить дело")}</button></header>
    <ul className="personal-task-list">{visible.map(task => {
      const sourceStep = content?.steps.find(step => step.id === task.sourceStepId);
      return <li key={task.id} className={`personal-plan-item${task.done ? " is-complete" : ""}`}>
        <div className="personal-plan-row">
          <label className="personal-plan-checkbox"><input data-task-checkbox type="checkbox" checked={task.done} aria-label={task.title[locale]} onChange={event => onToggle(group.id, task, event.currentTarget)} /></label>
          <details className="personal-plan-details">
            <summary><span className="personal-task-row-copy"><span className="personal-task-row-title">{task.title[locale]}</span>{task.date && <span className="personal-task-row-category"><CalendarDays size={15} aria-hidden="true" /><time dateTime={task.date}>{formatCalendarDate(task.date, locale)}</time></span>}</span><ChevronDown size={19} aria-hidden="true" /></summary>
            <div className="personal-plan-task-body">
              {task.sourceStepId && <PlanSourceStatus locale={locale} loading={loading} error={error} onRetry={onRetry} />}
              {sourceStep && !loading && !error && <PublishedStepDetails step={sourceStep} locale={locale} />}
              {task.note && <div className="personal-plan-note"><strong>{t("我的备注", "Моя заметка")}</strong><p>{task.note}</p></div>}
              <div className="personal-plan-task-actions"><button type="button" className="button secondary" onClick={event => onEdit(group.id, task, event.currentTarget)}><Pencil size={17} aria-hidden="true" />{t("编辑安排", "Изменить план")}</button>{!task.sourceStepId && <button type="button" className="personal-plan-remove" onClick={() => setConfirmDelete(task.id)}><Trash2 size={17} aria-hidden="true" />{t("删除", "Удалить")}</button>}</div>
              {confirmDelete === task.id && <div className="personal-plan-delete"><p>{t("删除这条个人安排？", "Удалить этот личный план?")}</p><button type="button" className="button secondary" onClick={event => { setConfirmDelete(null); onDelete(group.id, task, event.currentTarget); }}>{t("确认删除", "Удалить")}</button><button type="button" className="button secondary" onClick={event => { const trigger = event.currentTarget.closest(".personal-plan-task-body")?.querySelector<HTMLButtonElement>(".personal-plan-remove"); setConfirmDelete(null); trigger?.focus(); }}>{t("保留", "Оставить")}</button></div>}
            </div>
          </details>
        </div>
      </li>;
    })}</ul>
  </section>;
}

function SourcePlanGroup(props: GroupProps) {
  const { document, loading, error, reload } = useEditorialDocument(props.group.sourceId!);
  return <PlanGroupRows {...props} content={document} loading={loading} error={error} onRetry={reload} />;
}

export function PersonalTaskBoard() {
  const { locale } = useHomeState();
  const state = usePersonalPlan();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const id = useId();
  const [filter, setFilter] = useState<TaskFilter>("pending");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState("");
  const calendarInitialized = useRef(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [message, setMessage] = useState<"saved" | "done" | "pending" | "deleted" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<TaskFilter, HTMLButtonElement | null>>>({});
  const pendingFocus = useRef<{ trigger: HTMLElement; index: number } | null>(null);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const editorSequence = useRef(0);
  const tasks = state.groups.flatMap(group => group.tasks);
  const done = tasks.filter(task => task.done).length;
  const total = tasks.length;
  const percent = total ? Math.round(done / total * 100) : 0;
  const nextTask = tasks.find(task => !task.done);
  const filteredTasks = tasks.filter(task => filter === "all" || task.done === (filter === "completed"));
  const displayedGroups = view === "calendar" ? state.groups.map(group => ({ ...group, tasks: group.tasks.filter(task => task.date === calendarDate) })).filter(group => group.tasks.length > 0) : state.groups;
  const visibleTasks = view === "calendar" ? filteredTasks.filter(task => task.date === calendarDate) : filteredTasks;
  const calendarEmptyMessage = calendarDate
    ? filter === "pending" ? t("这一天没有待办", "На этот день нет запланированных дел") : filter === "completed" ? t("这一天还没有已完成事项", "На этот день пока нет выполненных дел") : t("这一天还没有安排", "На этот день пока нет планов")
    : filter === "pending" ? t("没有未定日期的待办", "Нет запланированных дел без даты") : filter === "completed" ? t("没有未定日期的已完成事项", "Нет выполненных дел без даты") : t("所有事项都已安排日期", "У всех дел уже есть дата");
  const tabs = [
    { id: "pending" as const, label: t("待办", "В планах"), count: total - done },
    { id: "completed" as const, label: t("已完成", "Готово"), count: done },
    { id: "all" as const, label: t("全部", "Все"), count: total },
  ];

  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending || pending.trigger.isConnected || !listRef.current?.isConnected) return;
    if (document.activeElement !== document.body && document.activeElement !== pending.trigger) return;
    const remaining = listRef.current.querySelectorAll<HTMLInputElement>("[data-task-checkbox]");
    const target = remaining[Math.min(pending.index, remaining.length - 1)] ?? tabRefs.current[filter];
    target?.focus({ preventScroll: true });
  }, [state.groups, filter]);

  function rememberFocus(trigger: HTMLElement) {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLInputElement>("[data-task-checkbox]") ?? []);
    const checkbox = trigger.matches("[data-task-checkbox]") ? trigger : trigger.closest("li")?.querySelector("[data-task-checkbox]");
    pendingFocus.current = { trigger, index: Math.max(0, items.indexOf(checkbox as HTMLInputElement)) };
  }
  function edit(groupId: string, draft: PlanTask | undefined, trigger: HTMLElement) {
    editorTrigger.current = trigger;
    setEditor({ groupId, draft: draft ?? (view === "calendar" ? { title: { zh: "", ru: "" }, date: calendarDate, note: "" } : undefined), key: ++editorSequence.current });
    setMessage(null);
  }
  function changeView(next: "list" | "calendar") {
    if (next === "calendar" && !calendarInitialized.current) {
      calendarInitialized.current = true;
      setCalendarDate(localCalendarToday());
    }
    setView(next);
  }
  function closeEditor(saved: boolean, date?: string) {
    const focusFilter = saved && !editor?.draft?.id ? "pending" : filter;
    setEditor(null);
    if (saved) {
      setMessage("saved");
      setFilter(focusFilter);
      if (view === "calendar" && date !== undefined) setCalendarDate(date);
    }
    requestAnimationFrame(() => { (editorTrigger.current?.isConnected ? editorTrigger.current : tabRefs.current[focusFilter])?.focus({ preventScroll: true }); });
  }
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setFilter(tabs[next].id); tabRefs.current[tabs[next].id]?.focus();
  }
  const groupActions = {
    locale, filter, onEdit: edit,
    onToggle: (groupId: string, task: PlanTask, trigger: HTMLInputElement) => { rememberFocus(trigger); togglePlanTask(groupId, task.id); setMessage(task.done ? "pending" : "done"); },
    onDelete: (groupId: string, task: PlanTask, trigger: HTMLButtonElement) => { rememberFocus(trigger); deletePlanTask(groupId, task.id); setMessage("deleted"); },
  };

  return <section className="personal-task-board" aria-labelledby={`${id}-title`}>
    <div className="personal-task-summary material-glass material-glass--dark creature-frame">
      <FrameCreature kind="bee" placement="top-left" />
      <header className="personal-task-summary-heading"><h2 id={`${id}-title`}>{t("我的准备进度", "Моя подготовка")}</h2><GuidanceIllustration kind="plan" complete={state.hydrated && total > 0 && done === total} className="personal-plan-guidance" /></header>
      <div className="personal-task-summary-body">
        <div className="personal-task-ring"><svg viewBox="0 0 240 240" role="progressbar" aria-label={t("个人清单完成进度", "Выполнение личного списка")} aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={state.hydrated ? done : undefined} aria-valuetext={state.hydrated ? t(`已完成 ${done} 项，共 ${total} 项，${percent}%`, `Выполнено ${done} из ${total}, ${percent}%`) : t("正在读取记录", "Загружаем записи")} aria-busy={!state.hydrated}>
          <circle className="personal-task-ring-track" cx="120" cy="120" r="103" /><circle className="personal-task-ring-value" cx="120" cy="120" r="103" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - percent} opacity={percent > 0 && state.hydrated ? 1 : 0} />
        </svg><div className="personal-task-ring-label" aria-hidden="true"><strong>{state.hydrated ? percent : "—"}<span>%</span></strong><span>{t("我的清单", "Мой список")}</span></div></div>
        <div className="personal-task-summary-copy"><p className="personal-task-completed-count">{state.hydrated ? t(`已完成 ${done} / ${total} 项`, `Выполнено ${done} из ${total}`) : t("正在读取记录…", "Загружаем записи…")}</p>{state.hydrated && <div className="personal-task-next"><span>{nextTask ? t("下一步", "Следующий шаг") : total ? t("都完成了", "Всё готово") : t("从一份清单开始", "Начните со списка")}</span><p>{nextTask?.title[locale] ?? (total ? t("给自己一点掌声。", "Отличная работа!") : t("把需要的入学须知或指南加入这里。", "Добавьте памятку или нужную инструкцию."))}</p>{nextTask?.date && <time dateTime={nextTask.date}>{formatCalendarDate(nextTask.date, locale)}</time>}</div>}</div>
      </div>
    </div>
    <div className="personal-task-list-card material-glass material-glass--raised">
      <header className="personal-task-list-heading"><h3>{t("我的清单与日期", "Мои дела и даты")}</h3>{state.groups.length > 0 ? <button type="button" className="button secondary" onClick={event => edit("personal", undefined, event.currentTarget)}><Plus size={18} aria-hidden="true" />{t("添加安排", "Добавить план")}</button> : <ClipboardCheck size={24} aria-hidden="true" />}</header>
      <div className="personal-plan-view material-switch" role="group" aria-label={t("清单显示方式", "Вид личного плана")}><button type="button" aria-pressed={view === "list"} onClick={() => changeView("list")}><ListTodo size={18} aria-hidden="true" />{t("清单", "Список")}</button><button type="button" aria-pressed={view === "calendar"} onClick={() => changeView("calendar")}><CalendarDays size={18} aria-hidden="true" />{t("日历", "Календарь")}</button></div>
      {state.recoveredDraft && !editor && <button type="button" className="button secondary personal-plan-recover" onClick={event => { editorTrigger.current = event.currentTarget; setEditor({ groupId: "personal", draft: state.recoveredDraft, recovered: true, key: ++editorSequence.current }); }}>{t("继续未保存的安排", "Продолжить черновик плана")}</button>}
      {editor && <PersonalTaskEditor key={editor.key} editor={editor} locale={locale} onClose={closeEditor} />}
      <div className="personal-task-tabs material-switch" role="tablist" aria-label={t("筛选个人待办", "Фильтр личных дел")}>{tabs.map((tab, index) => <button type="button" key={tab.id} id={`${id}-${tab.id}`} ref={element => { tabRefs.current[tab.id] = element; }} role="tab" aria-controls={`${id}-tasks`} aria-selected={filter === tab.id} tabIndex={filter === tab.id ? 0 : -1} onClick={() => setFilter(tab.id)} onKeyDown={event => navigateTabs(event, index)}><span>{tab.label}</span><span className="personal-task-tab-count">{state.hydrated ? tab.count : "—"}</span></button>)}</div>
      <div id={`${id}-tasks`} ref={listRef} role="tabpanel" aria-labelledby={`${id}-${filter}`} className="personal-task-list-panel" tabIndex={0} aria-busy={!state.hydrated}>
        {!state.hydrated ? <p className="personal-task-loading" role="status">{t("正在读取个人清单…", "Загружаем личный список…")}</p> : <>
          {view === "calendar" && <><PersonalPlanCalendar locale={locale} tasks={filteredTasks} selectedDate={calendarDate} onSelectDate={setCalendarDate} /><h4 className="personal-calendar-agenda-title">{calendarDate ? formatCalendarDate(calendarDate, locale) : t("未安排日期", "Без даты")}<span className="personal-task-tab-count">{visibleTasks.length}</span></h4></>}
          {displayedGroups.map(group => group.sourceId ? <SourcePlanGroup key={group.id} group={group} {...groupActions} /> : <PlanGroupRows key={group.id} group={group} {...groupActions} />)}
          {!visibleTasks.length && <div className="personal-task-empty"><CheckCheck size={32} aria-hidden="true" /><h4>{!total ? t("还没有加入清单", "Список пока пуст") : view === "calendar" ? calendarEmptyMessage : filter === "completed" ? t("完成的事项会留在这里", "Готовые дела появятся здесь") : t("当前待办已完成", "Все дела выполнены")}</h4>{!total ? <button type="button" className="button primary" aria-haspopup="dialog" onClick={() => setNoticeOpen(true)}><BookOpen size={18} aria-hidden="true" />{t("查看入学必看", "Открыть памятку")}</button> : view === "calendar" ? <button type="button" className="button secondary" onClick={event => edit("personal", undefined, event.currentTarget)}><Plus size={18} aria-hidden="true" />{calendarDate ? t("在这一天添加安排", "Добавить дело на эту дату") : t("添加安排", "Добавить план")}</button> : <button type="button" className="button secondary" onClick={() => { setFilter(filter === "completed" ? "pending" : "all"); tabRefs.current[filter === "completed" ? "pending" : "all"]?.focus(); }}>{filter === "completed" ? t("查看待办", "К планам") : t("查看全部", "Посмотреть все")}</button>}</div>}
        </>}
      </div>
      <p className="personal-plan-feedback" role="status" aria-live="polite">{message === "saved" ? t("安排已更新", "План обновлён") : message === "done" ? t("已完成一项", "Дело выполнено") : message === "pending" ? t("已恢复为待办", "Возвращено в планы") : message === "deleted" ? t("已删除这条安排", "План удалён") : ""}</p>
    </div>
    {state.storageUnavailable && <p className="personal-task-storage is-unavailable" role="status">{t("浏览器暂时无法保存，当前操作仅在本次浏览中保留。", "Хранилище недоступно. Изменения останутся только в этом сеансе.")}</p>}
    <EssentialsDialog open={noticeOpen} onClose={() => setNoticeOpen(false)} />
  </section>;
}
