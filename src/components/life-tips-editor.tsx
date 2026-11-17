"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Globe2, Plus, Save, Trash2 } from "lucide-react";
import { GlassSelect } from "@/components/glass-select";
import type { LifeTip } from "@/data/life-tips";
import type { Locale } from "@/lib/home-store";
import { formatCalendarDate } from "@/lib/locale-format";

export function lifeTipCategoryLabel(category: LifeTip["category"], locale: Locale) {
  const labels = { etiquette: { zh: "日常习惯", ru: "Этикет" }, venue: { zh: "场所礼仪", ru: "В общественных местах" }, rule: { zh: "公共规则", ru: "Правила" } };
  return labels[category][locale];
}

type EditorError = "required-zh" | "required-ru" | "url" | "unauthorized" | "forbidden" | "invalid_request" | "content_size" | "unavailable" | null;

export function LifeTipsEditor({ tips, locale, canSave, onSave, onCancel }: {
  tips: LifeTip[];
  locale: Locale;
  canSave: boolean;
  onSave: (tips: LifeTip[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(tips));
  const [language, setLanguage] = useState(locale);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<EditorError>(null);
  const form = useRef<HTMLFormElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const fieldLanguage = language === "zh" ? "zh-CN" : "ru";
  const error = errorCode === "required-zh" ? t("请补全中文标题、正文和来源名称。", "Заполните заголовки, тексты и названия источников на китайском.")
    : errorCode === "required-ru" ? t("请补全俄文标题、正文和来源名称。", "Заполните заголовки, тексты и названия источников на русском.")
    : errorCode === "url" ? t("请填写完整的 http 或 https 来源链接。", "Укажите полный адрес источника с http или https.")
    : errorCode === "unauthorized" || !canSave ? t("登录已失效，草稿仍保留。请重新登录后保存。", "Сеанс завершён. Черновик сохранён в этом окне. Войдите снова для сохранения.")
    : errorCode === "forbidden" ? t("暂时不能提交，请保留草稿后重试。", "Не удалось отправить изменения. Сохраните черновик и повторите попытку.")
    : errorCode === "invalid_request" ? t("内容未通过保存校验，请检查填写的字段。", "Проверьте заполненные поля: данные не прошли проверку.")
    : errorCode === "content_size" ? t("内容过长，请缩短后保存。", "Слишком много текста. Сократите его перед сохранением.")
    : errorCode === "unavailable" ? t("保存失败，草稿仍保留，可以重试。", "Не удалось сохранить. Черновик остался в окне — попробуйте ещё раз.") : "";

  function updateTip(tipId: string, update: (tip: LifeTip) => LifeTip) {
    setDraft(current => current.map(tip => tip.id === tipId ? update(tip) : tip));
  }
  function focusField(fieldId: string) {
    requestAnimationFrame(() => {
      const element = Array.from(form.current?.elements ?? []).find(item => item.id === fieldId) as HTMLElement | undefined;
      element?.closest("details")?.setAttribute("open", "");
      element?.focus();
    });
  }
  function addTip() {
    const tipId = `tip-${crypto.randomUUID()}`;
    setDraft(current => [...current, { id: tipId, category: "etiquette", title: { zh: "", ru: "" }, body: { zh: "", ru: "" }, sources: [], verifiedAt: null }]);
    focusField(`${id}-${tipId}-title`);
  }
  function moveTip(tipId: string, direction: -1 | 1) {
    setDraft(current => {
      const next = [...current];
      const index = next.findIndex(tip => tip.id === tipId);
      const moved = next.splice(index, 1)[0];
      next.splice(index + direction, 0, moved);
      return next;
    });
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-tip-id="${tipId}"] summary`)?.focus());
  }
  function removeTip(tipId: string, index: number) {
    const nextFocus = draft[index + 1]?.id ?? draft[index - 1]?.id;
    setDraft(current => current.filter(tip => tip.id !== tipId));
    requestAnimationFrame(() => {
      const summary = nextFocus ? form.current?.querySelector<HTMLElement>(`[data-tip-id="${nextFocus}"] summary`) : null;
      (summary ?? addButton.current)?.focus();
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !canSave) return;
    for (const lang of ["zh", "ru"] as const) {
      for (const tip of draft) {
        const sourceIndex = tip.sources.findIndex(source => !source.label[lang].trim());
        const field = !tip.title[lang].trim() ? "title" : !tip.body[lang].trim() ? "body" : sourceIndex >= 0 ? `source-${sourceIndex}-label` : null;
        if (field) {
          setLanguage(lang);
          setErrorCode(lang === "zh" ? "required-zh" : "required-ru");
          focusField(`${id}-${tip.id}-${field}`);
          return;
        }
      }
    }
    for (const tip of draft) {
      const index = tip.sources.findIndex(source => {
        try { return !["http:", "https:"].includes(new URL(source.url).protocol); } catch { return true; }
      });
      if (index >= 0) { setErrorCode("url"); focusField(`${id}-${tip.id}-source-${index}-url`); return; }
    }
    setSaving(true);
    setErrorCode(null);
    try { await onSave(draft); }
    catch (cause) {
      const code = cause instanceof Error ? cause.message : "unavailable";
      setErrorCode(["unauthorized", "forbidden", "invalid_request", "content_size"].includes(code) ? code as EditorError : "unavailable");
    } finally { setSaving(false); }
  }

  return <form ref={form} className="editorial-editor life-tips-editor" aria-label={t("编辑生活小提醒", "Редактировать полезные подсказки")} onSubmit={event => void submit(event)} onInvalidCapture={event => {
    const input = event.target as HTMLInputElement;
    input.closest("details")?.setAttribute("open", "");
    input.focus();
  }}>
    <fieldset className="editorial-fields" disabled={saving}>
      <div className="life-tips-editor-heading">
        <GlassSelect className="editorial-language" label={t("编辑语言", "Язык текста")} icon={<Globe2 size={20} />} value={language} disabled={saving} onChange={value => setLanguage(value as Locale)} options={[{ value: "zh", label: "中文", lang: "zh-CN" }, { value: "ru", label: "Русский", lang: "ru" }]} />
        <span>{t(`${draft.length} / 20 条`, `${draft.length} / 20 подсказок`)}</span>
      </div>
      {draft.map((tip, index) => <details key={tip.id} data-tip-id={tip.id} className="editorial-panel editorial-step material-glass material-glass--raised life-tip-editor-item" open={index === 0 || undefined}>
        <summary><strong>{index + 1}. {tip.title[language] || t("新提醒", "Новая подсказка")}</strong><ChevronDown size={20} /></summary>
        <div className="editorial-step-fields">
          <div className="life-tip-edit-actions">
            <GlassSelect label={t("类型", "Категория")} value={tip.category} disabled={saving} onChange={value => updateTip(tip.id, item => ({ ...item, category: value as LifeTip["category"] }))} options={(["etiquette", "venue", "rule"] as const).map(value => ({ value, label: lifeTipCategoryLabel(value, locale) }))} />
            <div className="life-tip-order-actions">
              <button type="button" className="icon-button" disabled={saving || index === 0} onClick={() => moveTip(tip.id, -1)} aria-label={t("上移这条提醒", "Переместить выше")}><ArrowUp size={20} /></button>
              <button type="button" className="icon-button" disabled={saving || index === draft.length - 1} onClick={() => moveTip(tip.id, 1)} aria-label={t("下移这条提醒", "Переместить ниже")}><ArrowDown size={20} /></button>
              <button type="button" className="icon-button" onClick={() => removeTip(tip.id, index)} aria-label={t("删除这条提醒", "Удалить подсказку")}><Trash2 size={19} /></button>
            </div>
          </div>
          <label className="editorial-field" htmlFor={`${id}-${tip.id}-title`}><span>{t("标题", "Заголовок")}</span><input id={`${id}-${tip.id}-title`} lang={fieldLanguage} maxLength={80} required value={tip.title[language]} onChange={event => updateTip(tip.id, item => ({ ...item, title: { ...item.title, [language]: event.target.value } }))} /></label>
          <label className="editorial-field" htmlFor={`${id}-${tip.id}-body`}><span>{t("正文", "Текст")}</span><textarea id={`${id}-${tip.id}-body`} lang={fieldLanguage} rows={4} maxLength={1000} required value={tip.body[language]} onChange={event => updateTip(tip.id, item => ({ ...item, body: { ...item.body, [language]: event.target.value } }))} /></label>
          <label className="editorial-field" htmlFor={`${id}-${tip.id}-example`}><span>{t("可复制的示例（选填）", "Пример для копирования (необязательно)")}</span><textarea id={`${id}-${tip.id}-example`} lang={fieldLanguage} rows={4} maxLength={2000} value={tip.example?.[language] ?? ""} onChange={event => updateTip(tip.id, item => ({ ...item, example: { zh: item.example?.zh ?? "", ru: item.example?.ru ?? "", [language]: event.target.value } }))} /></label>
          <div className="life-tip-source-editor">
            <div className="life-tip-source-heading"><h3>{t("来源", "Источники")}</h3><button type="button" className="button secondary" disabled={saving || tip.sources.length >= 4} onClick={() => {
              updateTip(tip.id, item => ({ ...item, sources: [...item.sources, { label: { zh: "", ru: "" }, url: "" }] }));
              focusField(`${id}-${tip.id}-source-${tip.sources.length}-label`);
            }}><Plus size={18} />{t("添加来源", "Добавить источник")}</button></div>
            {tip.sources.map((source, sourceIndex) => <div className="life-tip-source-fields" key={sourceIndex}>
              <label className="editorial-field" htmlFor={`${id}-${tip.id}-source-${sourceIndex}-label`}><span>{t("来源名称", "Название источника")}</span><input id={`${id}-${tip.id}-source-${sourceIndex}-label`} lang={fieldLanguage} required maxLength={160} value={source.label[language]} onChange={event => updateTip(tip.id, item => ({ ...item, sources: item.sources.map((entry, i) => i === sourceIndex ? { ...entry, label: { ...entry.label, [language]: event.target.value } } : entry) }))} /></label>
              <label className="editorial-field" htmlFor={`${id}-${tip.id}-source-${sourceIndex}-url`}><span>{t("来源链接", "Ссылка")}</span><input id={`${id}-${tip.id}-source-${sourceIndex}-url`} type="url" required maxLength={2048} value={source.url} onChange={event => updateTip(tip.id, item => ({ ...item, sources: item.sources.map((entry, i) => i === sourceIndex ? { ...entry, url: event.target.value } : entry) }))} /></label>
              <button type="button" className="icon-button" aria-label={t(`移除来源 ${sourceIndex + 1}`, `Удалить источник ${sourceIndex + 1}`)} onClick={() => {
                updateTip(tip.id, item => ({ ...item, sources: item.sources.filter((_, i) => i !== sourceIndex) }));
                requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-tip-id="${tip.id}"] .life-tip-source-heading button`)?.focus());
              }}><Trash2 size={18} /></button>
            </div>)}
            {tip.verifiedAt && <p className="life-tip-verification">{t("原内容核实日期：", "Дата проверки исходного текста: ")}<time dateTime={tip.verifiedAt}>{formatCalendarDate(tip.verifiedAt, locale)}</time></p>}
          </div>
        </div>
      </details>)}
      {!draft.length && <p className="life-tips-empty">{t("还没有提醒。添加第一条吧。", "Подсказок пока нет. Добавьте первую.")}</p>}
      <button ref={addButton} type="button" className="button secondary life-tips-add" disabled={saving || draft.length >= 20} onClick={addTip}><Plus size={19} />{t("添加提醒", "Добавить подсказку")}</button>
    </fieldset>
    <footer className="editorial-editor-footer material-glass material-glass--raised">
      {error && <p className="editorial-error" role="alert">{error}{(errorCode === "unauthorized" || !canSave) && <> <Link href="/me#account" target="_blank" rel="noopener noreferrer">{t("在新标签页登录", "Войти в новой вкладке")}</Link></>}</p>}
      <div><button type="button" className="button secondary" disabled={saving} onClick={onCancel}>{t("取消", "Отмена")}</button><button type="submit" className="button primary" disabled={saving || !canSave}><Save size={19} />{saving ? t("正在保存…", "Сохранение…") : t("保存提醒", "Сохранить подсказки")}</button></div>
    </footer>
  </form>;
}
