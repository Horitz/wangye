"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, FolderOpen, Globe2, ImagePlus, Images, Link2, Plus, Save, Trash2, UserRound } from "lucide-react";
import { GlassSelect } from "@/components/glass-select";
import { collectTagCounts, TagEditor, type TagEditorHandle } from "@/components/content-tags";
import { useEditorialCatalog } from "@/lib/editorial-store";
import type { EditorialDocument } from "@/data/editorial-content";
import { newGuideStep } from "@/data/guide-sections";
import type { LocalizedText } from "@/data/home-content";
import type { GuideReaderSource } from "@/data/guide-reader-content";
import { GUIDE_MEDIA_CAPTION_LIMIT, GUIDE_MEDIA_LIMIT, prepareGuideImage, type GuideMediaImage } from "@/lib/guide-media-store";
import type { Locale } from "@/lib/home-store";

const emptyText = (): LocalizedText => ({ zh: "", ru: "" });

function ImageEditor({ images, onChange, locale, label, onBusy, cover = false }: {
  images: GuideMediaImage[]; onChange: (images: GuideMediaImage[]) => void; locale: Locale; label: string; onBusy: (busy: boolean) => void; cover?: boolean;
}) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const replacement = useRef<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [imageError, setImageError] = useState<"limit" | "format" | "file-size" | "dimensions" | "decode" | null>(null);
  const message = imageError === "limit" ? t(`每组最多 ${GUIDE_MEDIA_LIMIT} 张图片。`, `В галерее может быть до ${GUIDE_MEDIA_LIMIT} изображений.`)
    : imageError === "format" ? t("请选择 JPEG、PNG 或 WebP 图片。", "Выберите JPEG, PNG или WebP.")
    : imageError === "file-size" ? t("请选择不超过 5MB 的图片。", "Выберите изображение до 5 МБ.")
    : imageError === "dimensions" ? t("请将图片缩小到 4096px 以内。", "Уменьшите изображение до 4096 пикселей.")
    : imageError === "decode" ? t("图片无法读取，请换一张。", "Не удалось прочитать изображение. Выберите другое.") : "";
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const photo = images[index];
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    const replaceAt = replacement.current;
    if (replaceAt === null && images.length + files.length > GUIDE_MEDIA_LIMIT) { setImageError("limit"); return; }
    onBusy(true); setImageError(null);
    try {
      const additions: GuideMediaImage[] = [];
      for (const file of replaceAt === null ? files : files.slice(0, 1)) additions.push(await prepareGuideImage(file));
      if (replaceAt === null) { onChange([...images, ...additions]); setSelected(images.length); }
      else onChange(images.map((image, imageIndex) => imageIndex === replaceAt ? { ...additions[0], caption: image.caption } : image));
    } catch (error) {
      const code = error instanceof Error ? error.message : "decode";
      setImageError(code === "format" || code === "file-size" || code === "dimensions" ? code : "decode");
    } finally { onBusy(false); }
  }
  function openPicker(replace: boolean) {
    replacement.current = replace ? index : null;
    if (input.current) { input.current.multiple = !replace; input.current.click(); }
  }
  function move(delta: number) {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next); setSelected(index + delta);
  }
  return <section className={`editorial-images${cover ? " editorial-images--cover" : ""}`} aria-labelledby={`${id}-title`}>
    <div className="editorial-section-heading"><h3 id={`${id}-title`}>{label}</h3>{(!cover || !!images.length) && <button type="button" className="button secondary" disabled={images.length >= GUIDE_MEDIA_LIMIT} onClick={() => openPicker(false)}><ImagePlus size={18} />{t("添加图片", "Добавить")}</button>}</div>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} accept="image/jpeg,image/png,image/webp" aria-label={label} onChange={event => void choose(event)} />
    {cover && !images.length && <button type="button" className="editorial-cover-upload" onClick={() => openPicker(false)}><ImagePlus size={32} strokeWidth={1.5} /><span>{t("添加封面图片", "Добавить обложку")}</span></button>}
    {!!images.length && <>
      <div className="editorial-image-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={photo.caption || t(`图片 ${index + 1}`, `Изображение ${index + 1}`)} />
      </div>
      <div className="guide-media-thumbnails" role="group" aria-label={t("选择图片", "Выбрать изображение")}>{images.map((image, imageIndex) => <button type="button" key={image.id} onClick={() => setSelected(imageIndex)} aria-pressed={index === imageIndex} aria-label={t(`图片 ${imageIndex + 1}`, `Изображение ${imageIndex + 1}`)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="" /><span>{imageIndex + 1}</span>
      </button>)}</div>
      <label className="editorial-field" htmlFor={`${id}-caption`}><span>{t("图片说明", "Подпись")}</span><input id={`${id}-caption`} value={photo.caption} maxLength={GUIDE_MEDIA_CAPTION_LIMIT} onChange={event => onChange(images.map((image, imageIndex) => imageIndex === index ? { ...image, caption: event.target.value } : image))} /></label>
      <div className="editorial-image-actions"><button type="button" className="button secondary" onClick={() => openPicker(true)}><Images size={18} />{t("替换", "Заменить")}</button><button type="button" className="icon-button" disabled={index === 0} onClick={() => move(-1)} aria-label={t("图片前移", "Переместить раньше")}><ArrowLeft size={19} /></button><button type="button" className="icon-button" disabled={index === images.length - 1} onClick={() => move(1)} aria-label={t("图片后移", "Переместить позже")}><ArrowRight size={19} /></button><button type="button" className="icon-button" onClick={() => { onChange(images.filter((_, imageIndex) => imageIndex !== index)); setSelected(Math.max(0, index - 1)); }} aria-label={t("移除图片", "Убрать изображение")}><Trash2 size={19} /></button></div>
    </>}
    {message && <p className="editorial-error" role="alert">{message}</p>}
  </section>;
}

function SourceEditor({ sources, onChange, locale, language }: {
  sources: GuideReaderSource[]; onChange: (sources: GuideReaderSource[]) => void; locale: Locale; language: Locale;
}) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const id = useId();
  return <details className="editorial-sources"><summary><Link2 size={18} /><span>{t("来源链接", "Источники")}</span><ChevronDown size={18} /></summary><div className="editorial-source-list">
    {sources.map((source, index) => <div key={index} className="editorial-source-row"><label className="editorial-field" htmlFor={`${id}-${index}-label`}><span>{t("名称", "Название")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-${index}-label`} value={source.label[language]} maxLength={300} onChange={event => onChange(sources.map((item, i) => i === index ? { ...item, label: { ...item.label, [language]: event.target.value } } : item))} /></label><label className="editorial-field" htmlFor={`${id}-${index}-url`}><span>{t("链接", "Ссылка")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-${index}-url`} type="url" value={source.url} placeholder="https://" maxLength={2048} onChange={event => onChange(sources.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} /></label><button type="button" className="icon-button" aria-label={t(`移除来源 ${index + 1}`, `Удалить источник ${index + 1}`)} onClick={() => onChange(sources.filter((_, i) => i !== index))}><Trash2 size={18} /></button></div>)}
    <button type="button" className="button secondary" disabled={sources.length >= 12} onClick={() => onChange([...sources, { label: emptyText(), url: "" }])}><Plus size={18} />{t("添加来源", "Добавить источник")}</button>
  </div></details>;
}

export function EditorialEditor({ document: original, locale, onSave, onCancel, creating = false }: {
  document: EditorialDocument;
  locale: Locale;
  onSave: (document: EditorialDocument) => Promise<void>;
  onCancel: () => void;
  creating?: boolean;
}) {
  const [draft, setDraft] = useState<EditorialDocument>(() => structuredClone(original));
  const { guides } = useEditorialCatalog();
  const [language, setLanguage] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<"materials" | "title" | "required-zh" | "required-ru" | "unauthorized" | "content-size" | "save" | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const tagEditor = useRef<TagEditorHandle>(null);
  const flexible = Boolean(draft.sectionId);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const id = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const error = errorCode === "materials" ? t("每步最多 30 项材料，每项最多 1000 字。", "До 30 документов на шаг и до 1000 символов на пункт.")
    : errorCode === "title" ? t("请填写标题和段落标题。", "Заполните заголовок и названия разделов.")
    : errorCode === "required-zh" ? t("请补全中文标题和段落标题。", "Заполните заголовок и названия разделов на китайском.")
    : errorCode === "required-ru" ? t("请补全俄文标题和段落标题。", "Заполните заголовок и названия разделов на русском.")
    : errorCode === "unauthorized" ? t("登录已失效，请重新登录后保存。", "Сеанс завершён. Войдите снова и сохраните.")
    : errorCode === "content-size" ? t("整篇图片与文字超过 32MB，请减少图片后保存。", "Общий объём текста и изображений превышает 32 МБ. Уменьшите число изображений и сохраните снова.")
    : errorCode === "save" ? t("保存失败，请重试。", "Не удалось сохранить. Повторите попытку.") : "";
  function updateStep(index: number, patch: Partial<EditorialDocument["steps"][number]>) {
    setDraft(current => ({ ...current, steps: current.steps.map((step, i) => i === index ? { ...step, ...patch } : step) }));
  }
  function updateMaterials(index: number, value: string) {
    const previous = draft.steps[index].materials;
    const lines = value.split("\n");
    const length = Math.max(lines.length, previous.length);
    updateStep(index, { materials: Array.from({ length }, (_, i) => ({ ...(previous[i] ?? emptyText()), [language]: lines[i] ?? "" })) });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tags = tagEditor.current?.commit();
    if (!tags) { event.currentTarget.reportValidity(); return; }
    const tooManyMaterials = draft.steps.some(step => {
      const materials = step.materials.filter(item => item.zh.trim() || item.ru.trim());
      return materials.length > 30 || materials.some(item => item.zh.length > 1000 || item.ru.length > 1000);
    });
    if (tooManyMaterials) { setErrorCode("materials"); return; }
    if (!flexible) {
      for (const lang of ["zh", "ru"] as const) {
        const stepIndex = draft.steps.findIndex(step => !step.title[lang].trim());
        const fieldId = !draft.title[lang].trim() ? `${id}-title` : stepIndex >= 0 ? `${id}-step-${stepIndex}-title` : null;
        if (fieldId) {
          setLanguage(lang);
          setErrorCode(lang === "zh" ? "required-zh" : "required-ru");
          requestAnimationFrame(() => {
            const field = Array.from(form.current?.elements ?? []).find(element => element.id === fieldId) as HTMLInputElement | undefined;
            field?.focus();
          });
          return;
        }
      }
    }
    setSaving(true); setErrorCode(null);
    try {
      const cleanSources = (sources: GuideReaderSource[]) => sources.filter(source => source.url.trim()).map(source => ({ ...source, url: source.url.trim() }));
      // Reuse authored text for an unfilled language without fabricating a translation.
      const both = (value: LocalizedText): LocalizedText => flexible ? { zh: value.zh.trim() ? value.zh : value.ru, ru: value.ru.trim() ? value.ru : value.zh } : value;
      if ((!draft.title.zh.trim() && !draft.title.ru.trim()) || draft.steps.some(step => !step.title.zh.trim() && !step.title.ru.trim())) {
        setErrorCode("title"); return;
      }
      await onSave({ ...draft, tags, title: both(draft.title), summary: both(draft.summary), author: { name: both(draft.author.name), role: both(draft.author.role) }, sources: cleanSources(draft.sources).map(source => ({ ...source, label: both(source.label) })), steps: draft.steps.map(step => ({ ...step, title: both(step.title), description: both(step.description), materials: step.materials.filter(item => item.zh.trim() || item.ru.trim()).map(both), ...(step.place && { place: both(step.place) }), ...(step.address && { address: both(step.address) }), ...(step.requirements && { requirements: both(step.requirements) }), sources: cleanSources(step.sources).map(source => ({ ...source, label: both(source.label) })) })) });
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setErrorCode(code === "unauthorized" || code === "content-size" ? code : "save");
    } finally { setSaving(false); }
  }
  const busy = saving || imageBusy;
  return <form ref={form} className="editorial-editor editorial-post-editor" onSubmit={event => void submit(event)} onInvalidCapture={event => {
    const field = event.target as HTMLInputElement;
    let ancestor = field.parentElement;
    while (ancestor) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    field.focus();
  }} aria-label={t("编辑内容", "Редактировать материал")}>
    <fieldset disabled={busy} className="editorial-fields">
      <div className="editorial-editor-heading"><h2 ref={heading} tabIndex={-1}>{creating ? t("写攻略", "Написать инструкцию") : t("编辑内容", "Редактировать материал")}</h2><GlassSelect className="editorial-language" value={language} onChange={value => setLanguage(value as Locale)} label={t("编辑语言", "Язык текста")} icon={<Globe2 size={20} />} options={[{ value: "zh", label: "中文", lang: "zh-CN" }, { value: "ru", label: "Русский", lang: "ru" }]} /></div>
      <section className="editorial-panel editorial-post-paper material-glass material-glass--raised">
        <ImageEditor images={draft.images} onChange={images => setDraft(current => ({ ...current, images }))} locale={locale} label={t("配图", "Изображения")} onBusy={setImageBusy} cover />
        <label className="editorial-field editorial-post-title" htmlFor={`${id}-title`}><span>{t("标题", "Заголовок")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-title`} value={draft.title[language]} maxLength={160} required={!flexible || (!draft.title.zh.trim() && !draft.title.ru.trim())} onChange={event => setDraft({ ...draft, title: { ...draft.title, [language]: event.target.value } })} /></label>
        <div className="editorial-post-author"><span className="editorial-author-icon" aria-hidden="true"><UserRound size={24} strokeWidth={1.75} /></span><div className="editorial-field-pair"><label className="editorial-field" htmlFor={`${id}-author`}><span>{t("作者", "Автор")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-author`} value={draft.author.name[language]} maxLength={120} onChange={event => setDraft({ ...draft, author: { ...draft.author, name: { ...draft.author.name, [language]: event.target.value } } })} /></label><label className="editorial-field" htmlFor={`${id}-role`}><span>{t("作者介绍", "Об авторе")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-role`} value={draft.author.role[language]} maxLength={160} onChange={event => setDraft({ ...draft, author: { ...draft.author, role: { ...draft.author.role, [language]: event.target.value } } })} /></label></div></div>
        <label className="editorial-field" htmlFor={`${id}-summary`}><span>{t("开篇正文", "Вступление")}</span><textarea lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-summary`} rows={4} value={draft.summary[language]} maxLength={4000} onChange={event => setDraft({ ...draft, summary: { ...draft.summary, [language]: event.target.value } })} /></label>
        <TagEditor ref={tagEditor} value={draft.tags ?? []} onChange={tags => setDraft(current => ({ ...current, tags }))} suggestions={collectTagCounts(guides).map(item => item.tag)} locale={locale} />
        <div className="editorial-post-sections">{draft.steps.map((step, index) => <section key={step.id} className="editorial-post-section" aria-labelledby={`${id}-section-${index}`}>
          <div className="editorial-section-heading"><h3 id={`${id}-section-${index}`} className="editorial-post-section-heading"><span className="editorial-step-number">{String(index + 1).padStart(2, "0")}</span>{t("正文段落", "Раздел текста")}</h3>{flexible && draft.steps.length > 1 && <button className="icon-button" type="button" aria-label={t(`移除段落 ${index + 1}`, `Удалить раздел ${index + 1}`)} onClick={() => setDraft(current => ({ ...current, steps: current.steps.filter(item => item.id !== step.id) }))}><Trash2 size={18} /></button>}</div>
          <label className="editorial-field" htmlFor={`${id}-step-${index}-title`}><span>{t("段落标题", "Заголовок раздела")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-step-${index}-title`} value={step.title[language]} maxLength={160} required={!flexible || (!step.title.zh.trim() && !step.title.ru.trim())} onChange={event => updateStep(index, { title: { ...step.title, [language]: event.target.value } })} /></label>
          <label className="editorial-field" htmlFor={`${id}-step-${index}-body`}><span>{t("正文", "Текст")}</span><textarea lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-step-${index}-body`} rows={5} value={step.description[language]} maxLength={8000} onChange={event => updateStep(index, { description: { ...step.description, [language]: event.target.value } })} /></label>
          <details className="editorial-attachments"><summary><FolderOpen size={19} /><span>{t("材料与办理信息", "Документы и оформление")}</span><ChevronDown size={18} /></summary><div className="editorial-attachment-fields">
        <label className="editorial-field" htmlFor={`${id}-step-${index}-materials`}><span>{t("所需材料 · 每行一项", "Документы · один на строку")}</span><textarea lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-step-${index}-materials`} rows={3} value={step.materials.map(item => item[language]).join("\n")} maxLength={12000} onChange={event => updateMaterials(index, event.target.value)} /></label>
        <ImageEditor images={step.images} onChange={images => updateStep(index, { images })} locale={locale} label={t("材料图片", "Изображения документов")} onBusy={setImageBusy} />
        <div className="editorial-field-pair">
          <label className="editorial-field" htmlFor={`${id}-step-${index}-place`}><span>{t("办理地点", "Куда обратиться")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-step-${index}-place`} value={step.place?.[language] ?? ""} maxLength={300} onChange={event => updateStep(index, { place: { ...(step.place ?? emptyText()), [language]: event.target.value } })} /></label>
          <label className="editorial-field" htmlFor={`${id}-step-${index}-address`}><span>{t("详细地址", "Адрес")}</span><input lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-step-${index}-address`} value={step.address?.[language] ?? ""} maxLength={1000} onChange={event => updateStep(index, { address: { ...(step.address ?? emptyText()), [language]: event.target.value } })} /></label>
        </div>
        <label className="editorial-field" htmlFor={`${id}-step-${index}-requirements`}><span>{t("办理要求", "Условия оформления")}</span><textarea lang={language === "zh" ? "zh-CN" : "ru"} id={`${id}-step-${index}-requirements`} rows={3} value={step.requirements?.[language] ?? ""} maxLength={4000} onChange={event => updateStep(index, { requirements: { ...(step.requirements ?? emptyText()), [language]: event.target.value } })} /></label>
        <SourceEditor sources={step.sources} onChange={sources => updateStep(index, { sources })} locale={locale} language={language} />
          </div></details>
        </section>)}</div>
        {flexible && <button className="button secondary" type="button" disabled={draft.steps.length >= 20} onClick={() => setDraft(current => ({ ...current, steps: [...current.steps, newGuideStep()] }))}><Plus size={18} />{t("添加段落", "Добавить раздел")}</button>}
        <SourceEditor sources={draft.sources} onChange={sources => setDraft(current => ({ ...current, sources }))} locale={locale} language={language} />
      </section>
    </fieldset>
    <footer className="editorial-editor-footer material-glass material-glass--raised">
      {error && <p className="editorial-error" role="alert">{error}</p>}
      {imageBusy && <p role="status">{t("正在处理图片…", "Обработка изображений…")}</p>}
      <div><button type="button" className="button secondary" disabled={busy} onClick={onCancel}>{t("取消", "Отмена")}</button><button type="submit" className="button primary" disabled={busy}><Save size={19} />{saving ? t("正在保存…", "Сохранение…") : creating ? t("发布攻略", "Опубликовать") : t("保存内容", "Сохранить")}</button></div>
    </footer>
  </form>;
}
