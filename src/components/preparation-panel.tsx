"use client";

import { GuideLink } from "@/components/guide-viewer-provider";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BookOpen, CalendarDays, Check, CheckCheck, ChevronDown, ClipboardList, Coffee, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import { preparationGroups, preparationItemIds } from "@/data/preparation-content";
import { useHomeState } from "@/lib/home-store";
import { cancelPreparationDraft, deletePreparationReminder, editPreparationReminder, isPreparationDate, localPreparationDate, MAX_PREPARATION_REMINDERS, preparationDaysUntil, savePreparationReminder, togglePreparationItem, togglePreparationReminder, updatePreparationDraft, usePreparationState } from "@/lib/preparation-store";

function useLocalDay() {
  const [today, setToday] = useState(() => localPreparationDate());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setToday(localPreparationDate());
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 100);
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    timer = setTimeout(refresh, 0);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  return today;
}

export function PreparationPanel({ view = "all" }: { view?: "all" | "checklist" | "dates" }) {
  const { locale, stage, profileSet } = useHomeState();
  const state = usePreparationState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const prefix = useId();
  const titleInput = useRef<HTMLInputElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const formToggle = useRef<HTMLButtonElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<"title" | "date" | "save" | null>(null);
  const [feedback, setFeedback] = useState<"saved" | "deleted" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const today = useLocalDay();
  const preferred = profileSet && stage === "newArrival" ? "arrival" : profileSet && stage === "enrolled" ? "daily" : "before";
  const groups = [...preparationGroups].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
  const count = state.completed.length;
  const percent = Math.round(count / preparationItemIds.length * 100);
  const reminders = [...state.reminders].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date));
  const hasDraft = Boolean(state.draft.title || state.draft.date || state.draft.note || state.draft.editingId);
  const showForm = formOpen || hasDraft;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFeedback(null);
    if (!state.draft.title.trim()) { setError("title"); titleInput.current?.focus(); return; }
    if (!isPreparationDate(state.draft.date)) { setError("date"); dateInput.current?.focus(); return; }
    if (!savePreparationReminder()) { setError("save"); return; }
    setError(null); setFeedback("saved"); setFormOpen(false);
    requestAnimationFrame(() => formToggle.current?.focus());
  };
  const startEdit = (id: string) => {
    if (!editPreparationReminder(id)) return;
    setError(null); setFeedback(null); setFormOpen(true);
    requestAnimationFrame(() => titleInput.current?.focus());
  };
  const cancelDelete = () => {
    const id = deleting; setDeleting(null);
    requestAnimationFrame(() => document.getElementById(`${prefix}-delete-${id}`)?.focus());
  };

  if (!state.hydrated) return <p className="prep-note" role="status">{t("正在读取你的准备记录…", "Загружаем ваши записи…")}</p>;
  return <div className="preparation-panel">
    {state.storageUnavailable && <p className="prep-storage" role="status">{t("浏览器暂时无法保存。记录仅保留在本次浏览，刷新或关闭后可能丢失。", "Хранилище недоступно. Записи останутся только в текущей сессии и могут исчезнуть после обновления или закрытия.")}</p>}
    {view !== "dates" && <section className="prep-checklist" aria-labelledby={`${prefix}-checklist-title`}>
      <div className="prep-progress-card material-glass material-glass--dark"><div className="prep-progress-heading"><ClipboardList size={28} strokeWidth={1.75} aria-hidden="true" /><div><h2 id={`${prefix}-checklist-title`}>{t("我的准备清单", "Мой список подготовки")}</h2><p>{t("一件一件来，进度由你记录。", "Шаг за шагом. Вы сами отмечаете сделанное.")}</p></div></div><div className="prep-progress-summary"><span>{t(`已勾选 ${count} / ${preparationItemIds.length} 项`, `Отмечено ${count} из ${preparationItemIds.length}`)}</span><strong>{percent}%</strong></div><progress max={preparationItemIds.length} value={count} aria-label={t("个人准备记录进度", "Прогресс личной подготовки")} /></div>
      <div className="prep-groups">{groups.map(group => {
        const Icon = group.id === "before" ? ClipboardList : group.id === "arrival" ? Plane : Coffee;
        const done = group.items.filter(item => state.completed.includes(item.id)).length;
        return <details className="prep-group material-glass material-glass--raised" key={group.id} open={group.id === preferred}><summary><span className="prep-group-icon material-glass"><Icon size={22} strokeWidth={1.75} /></span><span className="prep-group-title">{group.title[locale]}<span>{t(`已勾选 ${done} / ${group.items.length}`, `Отмечено ${done} из ${group.items.length}`)}</span></span><ChevronDown className="prep-chevron" size={20} aria-hidden="true" /></summary><div className="prep-group-body">{group.items.map(item => <label className={`prep-item${state.completed.includes(item.id) ? " is-complete" : ""}`} key={item.id}><input type="checkbox" checked={state.completed.includes(item.id)} onChange={() => togglePreparationItem(item.id)} /><span>{item.title[locale]}</span>{state.completed.includes(item.id) && <Check size={20} aria-hidden="true" />}</label>)}<GuideLink className="prep-guide-link material-glass prep-glass-action" guideId={group.guideId} returnHref="/essentials"><BookOpen size={18} strokeWidth={1.75} />{group.guideTitle[locale]}</GuideLink></div></details>;
      })}</div>
    </section>}
    {view !== "checklist" && <section className="prep-dates" aria-labelledby={`${prefix}-dates-title`}>
      <div className="prep-dates-heading"><div><h2 id={`${prefix}-dates-title`}>{t("记住自己的重要日期", "Мои важные даты")}</h2><p className="prep-note">{t("只显示你填写的安排，不推算办理期限，也不发送系统通知。", "Здесь только ваши планы: сроки оформления не рассчитываются, системные уведомления не отправляются.")}</p></div><CalendarDays size={28} strokeWidth={1.75} aria-hidden="true" /></div>
      <button ref={formToggle} className="button prep-add-date material-glass prep-glass-action" aria-expanded={showForm} aria-controls={`${prefix}-date-form`} onClick={() => { setFormOpen(true); setFeedback(null); requestAnimationFrame(() => titleInput.current?.focus()); }}><Plus size={20} />{hasDraft ? t("继续填写日期", "Продолжить запись") : t("添加日期", "Добавить дату")}</button>
      {showForm && <form className="prep-date-form material-glass material-glass--raised" id={`${prefix}-date-form`} onSubmit={submit} noValidate>
        <h3>{state.draft.editingId ? t("修改这条安排", "Изменить план") : t("新建一条安排", "Новый план")}</h3>
        <div className="prep-date-fields"><label htmlFor={`${prefix}-title`}>{t("事项名称", "Название")}<input id={`${prefix}-title`} ref={titleInput} value={state.draft.title} maxLength={80} required aria-invalid={error === "title"} aria-describedby={`${prefix}-form-feedback`} onChange={event => { updatePreparationDraft({ title: event.target.value }); setError(null); }} /></label><label htmlFor={`${prefix}-date`}>{t("自己确认的日期", "Подтверждённая вами дата")}<input id={`${prefix}-date`} ref={dateInput} type="date" min="1900-01-01" max="9999-12-31" required value={state.draft.date} aria-invalid={error === "date"} aria-describedby={`${prefix}-form-feedback`} onChange={event => { updatePreparationDraft({ date: event.target.value }); setError(null); }} /></label></div>
        <label htmlFor={`${prefix}-note`}>{t("备注（选填）", "Заметка (необязательно)")}<textarea id={`${prefix}-note`} rows={2} maxLength={240} value={state.draft.note} onChange={event => updatePreparationDraft({ note: event.target.value })} /></label>
        <p className="prep-form-error" id={`${prefix}-form-feedback`} role="status">{error === "title" ? t("请写下这条安排的名称。", "Укажите название плана.") : error === "date" ? t("请选择一个有效日期。", "Выберите допустимую дату.") : error === "save" ? t(`暂时无法添加，最多保留 ${MAX_PREPARATION_REMINDERS} 条安排。`, `Не удалось сохранить. Можно оставить до ${MAX_PREPARATION_REMINDERS} планов.`) : ""}</p>
        <div className="prep-form-actions"><button className="text-button material-glass prep-glass-action" type="button" onClick={() => { cancelPreparationDraft(); setFormOpen(false); setError(null); requestAnimationFrame(() => formToggle.current?.focus()); }}>{t("取消填写", "Отменить")}</button><button className="button primary" type="submit"><Check size={20} />{state.storageUnavailable ? t("保留在本次浏览", "Оставить в этой сессии") : t("保存日期", "Сохранить дату")}</button></div>
      </form>}
      <p className="prep-feedback" role="status">{feedback === "saved" ? state.storageUnavailable ? t("已保留在本次浏览中。", "Запись оставлена в текущей сессии.") : t("日期已保存到当前浏览器。", "Дата сохранена в этом браузере.") : feedback === "deleted" ? t("这条日期记录已删除。", "Запись о дате удалена.") : ""}</p>
      {reminders.length ? <ul className="prep-reminders">{reminders.map(item => {
        const days = preparationDaysUntil(item.date, today) ?? 0;
        const status = item.done ? t("已完成", "Готово") : days === 0 ? t("今天", "Сегодня") : days > 0 ? t(`还有 ${days} 天`, `Через ${days} дн.`) : t(`已过 ${-days} 天`, `Прошло ${-days} дн.`);
        return <li className={`prep-reminder material-glass material-glass--raised${item.done ? " is-complete" : days <= 0 ? " is-due" : ""}`} key={item.id}><div className="prep-reminder-main"><label className="prep-reminder-check"><input type="checkbox" checked={item.done} onChange={() => togglePreparationReminder(item.id)} /><span>{item.title}</span></label><span className="prep-reminder-status">{item.done && <CheckCheck size={16} aria-hidden="true" />}{status}</span></div><time dateTime={item.date}>{item.date}</time>{item.note && <p className="prep-reminder-note">{item.note}</p>}<div className="prep-reminder-actions"><button type="button" className="text-button material-glass prep-glass-action" onClick={() => startEdit(item.id)} aria-label={t(`修改日期：${item.title}`, `Изменить дату: ${item.title}`)}><Pencil size={16} />{t("修改", "Изменить")}</button>{deleting !== item.id && <button type="button" className="text-button material-glass prep-glass-action" id={`${prefix}-delete-${item.id}`} onClick={() => setDeleting(item.id)} aria-label={t(`删除日期：${item.title}`, `Удалить дату: ${item.title}`)}><Trash2 size={16} />{t("删除", "Удалить")}</button>}</div>{deleting === item.id && <div className="prep-delete-confirm" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); cancelDelete(); } }}><p>{t("删除这条日期记录？", "Удалить эту запись о дате?")}</p><div><button className="text-button material-glass prep-glass-action" type="button" onClick={() => { if (deletePreparationReminder(item.id)) { setDeleting(null); setFeedback("deleted"); formToggle.current?.focus(); } }}>{t("确认删除", "Удалить")}</button><button autoFocus className="text-button material-glass prep-glass-action" type="button" onClick={cancelDelete}>{t("取消", "Отмена")}</button></div></div>}</li>;
      })}</ul> : <div className="prep-dates-empty material-glass"><CalendarDays size={32} strokeWidth={1.75} aria-hidden="true" /><p>{t("还没有日期记录。把已经确认的安排记在这里。", "Дат пока нет. Запишите здесь свои подтверждённые планы.")}</p></div>}
    </section>}
  </div>;
}
