"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Globe2, Save } from "lucide-react";
import { GlassSelect } from "@/components/glass-select";
import type { HubContent } from "@/data/hub-content";
import type { Locale } from "@/lib/home-store";

export function HubEditor({ document, locale, onSave, onCancel }: {
  document: HubContent; locale: Locale; onSave: (document: HubContent) => Promise<void>; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(document));
  const [language, setLanguage] = useState(locale);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<"required-zh" | "required-ru" | "unauthorized" | "save" | null>(null);
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const error = errorCode === "required-zh" ? t("请补全中文必填项。", "Заполните обязательные поля на китайском.")
    : errorCode === "required-ru" ? t("请补全俄文必填项。", "Заполните обязательные поля на русском.")
    : errorCode === "unauthorized" ? t("登录已失效，请重新登录后保存。", "Сеанс завершён. Войдите снова и сохраните.")
    : errorCode === "save" ? t("保存失败，请重试。", "Не удалось сохранить. Повторите попытку.") : "";
  const welcomeFields = [
    { key: "eyebrow", label: t("顶部短句", "Надпись над заголовком"), max: 120, required: false },
    { key: "title", label: t("欢迎标题", "Приветственный заголовок"), max: 160, required: true },
    { key: "highlight", label: t("强调文字", "Выделенный текст"), max: 160, required: false },
    { key: "description", label: t("欢迎介绍", "Приветственное описание"), max: 1000, required: false },
  ] as const;
  const entryLabels = [t("入学必看入口", "Вход в памятку"), t("办事指南入口", "Вход в инструкции"), t("留学社区入口", "Вход в сообщество")];
  const entryFields = [
    { key: "title", label: t("入口标题", "Название раздела"), max: 160, required: true },
    { key: "description", label: t("入口介绍", "Описание раздела"), max: 1000, required: false },
    { key: "action", label: t("按钮文字", "Текст кнопки"), max: 80, required: true },
  ] as const;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const lang of ["zh", "ru"] as const) {
      const entry = draft.entries.find(item => !item.title[lang].trim() || !item.action[lang].trim());
      const fieldId = !draft.title[lang].trim() ? `${id}-title` : entry ? `${id}-${entry.id}-${!entry.title[lang].trim() ? "title" : "action"}` : null;
      if (fieldId) {
        setLanguage(lang);
        setErrorCode(lang === "zh" ? "required-zh" : "required-ru");
        requestAnimationFrame(() => {
          const input = Array.from(form.current?.elements ?? []).find(element => element.id === fieldId) as HTMLInputElement | undefined;
          const details = input?.closest("details");
          if (details) details.open = true;
          input?.focus();
        });
        return;
      }
    }
    setSaving(true); setErrorCode(null);
    try { await onSave(draft); }
    catch (cause) { setErrorCode(cause instanceof Error && cause.message === "unauthorized" ? "unauthorized" : "save"); }
    finally { setSaving(false); }
  }
  return <form ref={form} className="editorial-editor" aria-label={t("编辑留学生活页面", "Редактировать студенческую жизнь")} onSubmit={event => void submit(event)} onInvalidCapture={event => {
    const input = event.target as HTMLInputElement;
    const details = input.closest("details");
    if (details) details.open = true;
    input.focus();
  }}>
    <fieldset className="editorial-fields" disabled={saving}>
      <GlassSelect className="editorial-language" label={t("编辑语言", "Язык текста")} icon={<Globe2 size={20} />} value={language} onChange={value => setLanguage(value as Locale)} options={[{ value: "zh", label: "中文", lang: "zh-CN" }, { value: "ru", label: "Русский", lang: "ru" }]} />
      <section className="editorial-panel material-glass material-glass--raised">
        {welcomeFields.map(field => <label key={field.key} className="editorial-field" htmlFor={`${id}-${field.key}`}><span>{field.label}</span>{field.key === "description" ? <textarea lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-${field.key}`} rows={3} maxLength={field.max} value={draft[field.key][language]} onChange={event => setDraft({ ...draft, [field.key]: { ...draft[field.key], [language]: event.target.value } })} /> : <input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-${field.key}`} maxLength={field.max} required={field.required} value={draft[field.key][language]} onChange={event => setDraft({ ...draft, [field.key]: { ...draft[field.key], [language]: event.target.value } })} />}</label>)}
      </section>
      {draft.entries.map((entry, index) => <details key={entry.id} className="editorial-panel editorial-step material-glass material-glass--raised"><summary><strong>{entryLabels[index]}</strong><ChevronDown size={20} /></summary><div className="editorial-step-fields">
        {entryFields.map(field => <label key={field.key} className="editorial-field" htmlFor={`${id}-${entry.id}-${field.key}`}><span>{field.label}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-${entry.id}-${field.key}`} maxLength={field.max} required={field.required} value={entry[field.key][language]} onChange={event => setDraft({ ...draft, entries: draft.entries.map(item => item.id === entry.id ? { ...item, [field.key]: { ...item[field.key], [language]: event.target.value } } : item) })} /></label>)}
      </div></details>)}
    </fieldset>
    <footer className="editorial-editor-footer material-glass material-glass--raised">{error && <p className="editorial-error" role="alert">{error}</p>}<div><button className="button secondary" type="button" disabled={saving} onClick={onCancel}>{t("取消", "Отмена")}</button><button className="button primary" type="submit" disabled={saving}><Save size={19} />{saving ? t("正在保存…", "Сохранение…") : t("保存本页", "Сохранить страницу")}</button></div></footer>
  </form>;
}
