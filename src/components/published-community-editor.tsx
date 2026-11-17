"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ImagePlus, Images, Link2, Plus, Save, Trash2, UserRound } from "lucide-react";
import { GlassSelect } from "@/components/glass-select";
import { collectTagCounts, TagEditor, type TagEditorHandle } from "@/components/content-tags";
import type { CommunityImage, CommunityPost } from "@/data/community-content";
import { communityTopics } from "@/data/community-topics";
import { schoolOptions, type SchoolId } from "@/data/school-options";
import { COMMUNITY_IMAGE_LIMIT } from "@/lib/community-published-schema.mjs";
import { prepareGuideImage } from "@/lib/guide-media-store";
import type { Locale } from "@/lib/home-store";
import "@/app/community-editor.css";

const emptyText = () => ({ zh: "", ru: "" });

function CommunityImageEditor({ images, language, locale, onChange, onBusy }: {
  images: CommunityImage[]; language: Locale; locale: Locale; onChange: (images: CommunityImage[]) => void; onBusy: (busy: boolean) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const replacement = useRef<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const index = Math.min(selected, Math.max(images.length - 1, 0));
  const photo = images[index];
  const message = error === "limit" ? t(`最多添加 ${COMMUNITY_IMAGE_LIMIT} 张图片。`, `Можно добавить до ${COMMUNITY_IMAGE_LIMIT} фотографий.`)
    : error === "format" ? t("请选择 JPEG、PNG 或 WebP 图片。", "Выберите JPEG, PNG или WebP.")
    : error === "file-size" ? t("请选择不超过 5MB 的图片。", "Выберите изображение до 5 МБ.")
    : error === "dimensions" ? t("请将图片缩小到 4096px 以内。", "Уменьшите изображение до 4096 пикселей.")
    : error ? t("图片无法读取，请换一张。", "Не удалось прочитать изображение. Выберите другое.") : "";
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    const replaceId = replacement.current;
    if (!replaceId && images.length + files.length > COMMUNITY_IMAGE_LIMIT) { setError("limit"); return; }
    setBusy(true); onBusy(true); setError(null);
    try {
      const additions: CommunityImage[] = [];
      for (const file of replaceId ? files.slice(0, 1) : files) {
        const prepared = await prepareGuideImage(file);
        additions.push({ ...prepared, caption: emptyText() });
      }
      if (replaceId) {
        // A replacement is a new image: keep its caption, not the old image's attribution.
        onChange(images.map(image => image.id === replaceId ? { ...additions[0], caption: { ...image.caption } } : image));
      } else { onChange([...images, ...additions]); setSelected(images.length); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "decode"); }
    finally { setBusy(false); onBusy(false); }
  }
  function openPicker(replace: boolean) {
    replacement.current = replace ? photo.id : null;
    if (input.current) { input.current.multiple = !replace; input.current.click(); }
  }
  function move(delta: number) {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next); setSelected(index + delta);
  }
  return <section className="editorial-images editorial-images--cover" aria-labelledby={`${id}-title`}>
    <div className="editorial-section-heading"><h3 id={`${id}-title`}>{t("帖子图片", "Фотографии записи")}{images.length ? ` · ${images.length}` : ""}</h3>{images.length > 0 && <button type="button" className="button secondary" disabled={busy || images.length >= COMMUNITY_IMAGE_LIMIT} onClick={() => openPicker(false)}><ImagePlus size={18} />{t("添加图片", "Добавить фото")}</button>}</div>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} accept="image/jpeg,image/png,image/webp" aria-label={t("选择帖子图片", "Выбрать фотографии записи")} onChange={event => void choose(event)} />
    {!images.length ? <button type="button" className="editorial-cover-upload" disabled={busy} onClick={() => openPicker(false)}><ImagePlus size={32} strokeWidth={1.5} /><span>{t("添加图片", "Добавить фотографии")}</span></button> : <>
      <div className="editorial-image-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={photo.caption[language] || t(`图片 ${index + 1}`, `Фотография ${index + 1}`)} />
      </div>
      <div className="guide-media-thumbnails" role="group" aria-label={t("选择图片", "Выбрать фотографию")}>{images.map((image, imageIndex) => <button type="button" key={image.id} disabled={busy} onClick={() => setSelected(imageIndex)} aria-pressed={index === imageIndex} aria-label={t(`图片 ${imageIndex + 1}`, `Фотография ${imageIndex + 1}`)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="" /><span>{imageIndex + 1}</span>
      </button>)}</div>
      <label className="editorial-field" htmlFor={`${id}-caption`}><span>{t("图片说明", "Подпись к фотографии")}</span><input id={`${id}-caption`} lang={language === "zh" ? "zh-CN" : "ru"} disabled={busy} value={photo.caption[language]} maxLength={160} onChange={event => onChange(images.map((image, imageIndex) => imageIndex === index ? { ...image, caption: { ...image.caption, [language]: event.target.value } } : image))} /></label>
      <div className="editorial-image-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => openPicker(true)}><Images size={18} />{t("替换", "Заменить")}</button><button type="button" className="icon-button" disabled={busy || index === 0} onClick={() => move(-1)} aria-label={t("图片前移", "Переместить раньше")}><ArrowLeft size={19} /></button><button type="button" className="icon-button" disabled={busy || index === images.length - 1} onClick={() => move(1)} aria-label={t("图片后移", "Переместить позже")}><ArrowRight size={19} /></button><button type="button" className="icon-button" disabled={busy} onClick={() => { onChange(images.filter((_, imageIndex) => imageIndex !== index)); setSelected(Math.max(0, index - 1)); }} aria-label={t("移除图片", "Убрать фотографию")}><Trash2 size={19} /></button></div>
    </>}
    {busy && <p className="community-field-help" role="status">{t("正在处理图片…", "Обрабатываем фотографии…")}</p>}
    {message && <p className="editorial-error" role="alert">{message}</p>}
  </section>;
}

/** Published content is a separate draft; opening or cancelling never edits the local original. */
export function PublishedCommunityEditor({ post, posts, locale, onSave, onCancel, onBusyChange }: {
  post: CommunityPost; posts: CommunityPost[]; locale: Locale; onSave: (post: CommunityPost) => Promise<void>; onCancel: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => structuredClone(post));
  const [language, setLanguage] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tagEditor = useRef<TagEditorHandle>(null);
  const form = useRef<HTMLFormElement>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const fieldLang = language === "zh" ? "zh-CN" : "ru";
  const sources = draft.sources ?? [];
  const busy = saving || imageBusy;
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  const message = error === "required-zh" ? t("请补全中文标题、正文，以及已填写的署名和链接名称。", "Заполните китайские заголовок, текст, подпись автора и названия добавленных ссылок.")
    : error === "required-ru" ? t("请补全俄文标题、正文，以及已填写的署名和链接名称。", "Заполните русские заголовок, текст, подпись автора и названия добавленных ссылок.")
    : error === "unauthorized" ? t("登录已失效，请重新登录后保存。草稿仍保留在这里。", "Сеанс завершён. Войдите снова и сохраните. Черновик остаётся здесь.")
    : error === "featured_limit" ? t("目标学校的精选已满，请先取消本帖精选，或选择其他学校。", "Подборка выбранного вуза заполнена. Сначала уберите запись из подборки или выберите другой вуз.")
    : error === "content_size" ? t("内容超过 32MB，请减少图片后保存。", "Объём записи превышает 32 МБ. Уменьшите число изображений.")
    : error === "not_found" ? t("这篇帖子已不存在。当前修改仍保留，请先确认帖子状态。", "Запись больше не существует. Ваши изменения сохранены в редакторе.")
    : error === "invalid_request" ? t("请检查标题、正文、图片说明和来源链接后再保存。", "Проверьте заголовок, текст, подписи и ссылки перед сохранением.")
    : error === "busy" ? t("另一项保存尚未完成，请稍后再试。", "Дождитесь завершения другого сохранения и повторите попытку.")
    : error ? t("保存失败，修改仍保留在这里，请重试。", "Не удалось сохранить. Изменения остаются здесь, попробуйте снова.") : "";
  function update(patch: Partial<CommunityPost>) { setDraft(current => ({ ...current, ...patch })); setError(null); }
  function focusField(languageToOpen: Locale, suffix: string) {
    setLanguage(languageToOpen); setError(`required-${languageToOpen}`);
    requestAnimationFrame(() => {
      const field = document.getElementById(`${id}-${suffix}`);
      const details = field?.closest("details");
      if (details) details.open = true;
      field?.focus();
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const tags = tagEditor.current?.commit();
    if (!tags) { event.currentTarget.reportValidity(); return; }
    for (const lang of ["zh", "ru"] as const) {
      if (draft.title[lang].trim().length < 3) { focusField(lang, "title"); return; }
      if (draft.body[lang].trim().length < 10) { focusField(lang, "body"); return; }
      const sourceIndex = sources.findIndex(source => (source.url.trim() || source.label.zh.trim() || source.label.ru.trim()) && !source.label[lang].trim());
      if (sourceIndex !== -1) { focusField(lang, `source-${sourceIndex}-label`); return; }
    }
    if (!event.currentTarget.checkValidity()) {
      const invalid = event.currentTarget.querySelector<HTMLInputElement | HTMLTextAreaElement>("input:invalid, textarea:invalid");
      const details = invalid?.closest("details");
      if (details) details.open = true;
      invalid?.focus();
      event.currentTarget.reportValidity();
      return;
    }
    const author = draft.author;
    if (author && Boolean(author.zh.trim()) !== Boolean(author.ru.trim())) {
      focusField(author.zh.trim() ? "ru" : "zh", "author"); return;
    }
    const localized = (value: { zh: string; ru: string }) => ({ zh: value.zh.trim(), ru: value.ru.trim() });
    const next: CommunityPost = { ...draft, title: localized(draft.title), body: localized(draft.body), tags,
      images: (draft.images ?? []).map(image => ({ ...image, caption: localized(image.caption) })),
      sources: sources.filter(source => source.url.trim() || source.label.zh.trim() || source.label.ru.trim()).map(source => ({ label: localized(source.label), url: source.url.trim() })),
    };
    if (author?.zh.trim() && author.ru.trim()) next.author = localized(author); else delete next.author;
    setSaving(true); setError(null);
    try { await onSave(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "unavailable"); }
    finally { setSaving(false); }
  }
  return <form ref={form} className="editorial-editor editorial-post-editor published-community-editor" onSubmit={event => void submit(event)} noValidate>
    <fieldset className="editorial-fields" disabled={saving}>
      <div className="editorial-editor-heading"><h2>{t("编辑帖子", "Редактировать запись")}</h2><div className="editorial-language"><GlassSelect label={t("编辑语言", "Язык записи")} value={language} disabled={busy} onChange={value => setLanguage(value as Locale)} options={[{ value: "zh", label: "中文", lang: "zh-CN" }, { value: "ru", label: "Русский", lang: "ru" }]} /></div></div>
      <CommunityImageEditor images={draft.images ?? []} language={language} locale={locale} onChange={images => update({ images })} onBusy={setImageBusy} />
      <div className="editorial-panel editorial-post-paper material-glass material-glass--raised">
        <label className="editorial-field editorial-post-title" htmlFor={`${id}-title`}><span>{t("标题", "Заголовок")}</span><input id={`${id}-title`} lang={fieldLang} minLength={3} maxLength={80} required value={draft.title[language]} onChange={event => update({ title: { ...draft.title, [language]: event.target.value } })} /></label>
        <div className="editorial-post-author"><span className="editorial-author-icon" aria-hidden="true"><UserRound size={24} /></span><label className="editorial-field" htmlFor={`${id}-author`}><span>{t("作者署名", "Подпись автора")}</span><input id={`${id}-author`} lang={fieldLang} value={draft.author?.[language] ?? ""} maxLength={80} onChange={event => update({ author: { ...(draft.author ?? emptyText()), [language]: event.target.value } })} /></label></div>
        <label className="editorial-field" htmlFor={`${id}-body`}><span>{t("正文", "Текст")}</span><textarea id={`${id}-body`} lang={fieldLang} rows={12} minLength={10} maxLength={3000} required value={draft.body[language]} onChange={event => update({ body: { ...draft.body, [language]: event.target.value } })} /></label>
        <div className="editorial-field-pair"><GlassSelect label={t("所属学校", "Вуз")} value={draft.schoolId} disabled={saving} onChange={value => update({ schoolId: value as SchoolId })} options={schoolOptions.map(option => ({ value: option.id, label: option.label[locale] }))} /><GlassSelect label={t("形式", "Формат")} value={draft.kind} disabled={saving} onChange={value => update({ kind: value as CommunityPost["kind"] })} options={[{ value: "note", label: t("生活笔记", "Заметка") }, { value: "discussion", label: t("讨论", "Обсуждение") }]} /></div>
        <GlassSelect label={t("主题", "Тема")} value={draft.topic} disabled={saving} onChange={value => update({ topic: value as CommunityPost["topic"] })} options={Object.entries(communityTopics).map(([value, copy]) => ({ value, label: copy[locale] }))} />
        <TagEditor ref={tagEditor} value={draft.tags ?? []} onChange={tags => update({ tags })} suggestions={collectTagCounts(posts.filter(item => item.schoolId === draft.schoolId)).map(item => item.tag)} locale={locale} />
        <details className="editorial-sources"><summary><Link2 size={18} /><span>{t("相关链接", "Ссылки")}</span><ChevronDown size={18} /></summary><div className="editorial-source-list">
          {sources.map((source, index) => <div className="editorial-source-row" key={index}><label className="editorial-field" htmlFor={`${id}-source-${index}-label`}><span>{t("名称", "Название")}</span><input id={`${id}-source-${index}-label`} lang={fieldLang} maxLength={160} value={source.label[language]} onChange={event => update({ sources: sources.map((item, i) => i === index ? { ...item, label: { ...item.label, [language]: event.target.value } } : item) })} /></label><label className="editorial-field" htmlFor={`${id}-source-${index}-url`}><span>{t("链接", "Ссылка")}</span><input id={`${id}-source-${index}-url`} type="url" maxLength={2000} value={source.url} placeholder="https://" required={Boolean(source.label.zh.trim() || source.label.ru.trim())} onChange={event => update({ sources: sources.map((item, i) => i === index ? { ...item, url: event.target.value } : item) })} /></label><button type="button" className="icon-button" onClick={() => update({ sources: sources.filter((_, i) => i !== index) })} aria-label={t(`移除链接 ${index + 1}`, `Убрать ссылку ${index + 1}`)}><Trash2 size={18} /></button></div>)}
          <button type="button" className="button secondary" disabled={sources.length >= 12} onClick={() => update({ sources: [...sources, { label: emptyText(), url: "" }] })}><Plus size={18} />{t("添加链接", "Добавить ссылку")}</button>
        </div></details>
      </div>
    </fieldset>
    <footer className="editorial-editor-footer material-glass material-glass--raised">
      {message && <p className="editorial-error" role="alert">{message}</p>}
      <div><button type="button" className="button secondary" disabled={busy} onClick={onCancel}>{t("取消", "Отмена")}</button><button type="submit" className="button primary" disabled={busy}><Save size={18} />{saving ? t("正在保存…", "Сохраняем…") : t("保存修改", "Сохранить изменения")}</button></div>
    </footer>
  </form>;
}
