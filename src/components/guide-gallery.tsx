"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCheck, FileText, FolderOpen, ImagePlus, Images, ListChecks, MapPin, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { SwipeCarousel } from "@/components/swipe-carousel";
import { ClayStudent } from "@/components/clay-student";
import type { GuideReaderSlide } from "@/data/guide-reader-content";
import type { Locale } from "@/lib/home-store";
import { GUIDE_MEDIA_CAPTION_LIMIT, GUIDE_MEDIA_LIMIT, prepareGuideImage, saveGuideMedia, useGuideMedia, type GuideMediaImage } from "@/lib/guide-media-store";

export function GuideGallery({ guideId, locale, fallbackSlides = [], variant = "cover", fallbackContent }: {
  guideId: string;
  locale: Locale;
  fallbackSlides?: GuideReaderSlide[];
  variant?: "cover" | "materials";
  fallbackContent?: ReactNode;
}) {
  const materials = variant === "materials";
  const media = useGuideMedia(guideId);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const id = useId();
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const gallery = useRef<HTMLDivElement>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const manageButton = useRef<HTMLButtonElement>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const custom = media.images.length > 0;
  const count = custom ? media.images.length : fallbackSlides.length;
  const index = Math.min(selected, Math.max(0, count - 1));
  const photo = custom ? media.images[index] : null;
  const fallback = fallbackSlides[index % fallbackSlides.length];
  function move(delta: number) { setSelected((index + delta + count) % count); setMessage(""); }
  function openEditor() {
    setEditing(true); setConfirmReset(false); setMessage("");
    const reader = gallery.current?.closest(".guide-reader-scroll");
    if (reader && !materials) reader.scrollTop = 0;
    requestAnimationFrame(() => { editorHeading.current?.focus({ preventScroll: true }); editorHeading.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); });
  }
  function closeEditor() {
    setEditing(false); setConfirmReset(false);
    const reader = gallery.current?.closest(".guide-reader-scroll");
    if (reader && !materials) reader.scrollTop = 0;
    manageButton.current?.focus({ preventScroll: true });
    if (materials) manageButton.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  async function commit(images: GuideMediaImage[], nextIndex = index) {
    const result = await saveGuideMedia(guideId, images);
    setMessage(result);
    if (result !== "invalid") setSelected(nextIndex);
    return result;
  }
  async function chooseFiles(event: ChangeEvent<HTMLInputElement>, replace: boolean) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length || busy) return;
    if (files.length + (replace ? Math.max(0, media.images.length - 1) : media.images.length) > GUIDE_MEDIA_LIMIT) { setMessage("count"); return; }
    const task = ++generation.current;
    setBusy(true); setMessage("processing");
    try {
      const additions: GuideMediaImage[] = [];
      for (const file of files) additions.push(await prepareGuideImage(file));
      if (task !== generation.current) return;
      const images = [...media.images];
      if (replace && custom) images.splice(index, 1, { ...additions[0], caption: photo?.caption ?? "" });
      else images.push(...additions);
      await commit(images, replace && custom ? index : media.images.length);
    } catch (error) {
      if (task === generation.current) setMessage(error instanceof Error ? error.message : "decode");
    } finally { if (task === generation.current) setBusy(false); }
  }
  async function editCaption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo || busy) return;
    const caption = String(new FormData(event.currentTarget).get("caption") ?? "").replace(/\r?\n/g, " ").trim();
    setBusy(true);
    try { await commit(media.images.map(image => image.id === photo.id ? { ...image, caption } : image)); }
    finally { setBusy(false); }
  }
  async function removeCurrent() {
    if (!photo || busy) return;
    setBusy(true);
    try { await commit(media.images.filter(image => image.id !== photo.id), Math.max(0, index - 1)); }
    finally { setBusy(false); }
  }
  async function restore() {
    if (busy) return;
    setBusy(true);
    try { await commit([], 0); setConfirmReset(false); }
    finally { setBusy(false); }
  }
  const messages: Record<string, string> = {
    saved: t("图片已保存在此浏览器。", "Изображения сохранены в этом браузере."),
    memory: t("浏览器无法保存；本次图片只在当前浏览期间保留。", "Сохранение недоступно. Изображения останутся только в этом сеансе."),
    processing: t("正在处理图片…", "Обработка изображений…"),
    count: t(`每组最多添加 ${GUIDE_MEDIA_LIMIT} 张图片。`, `В одной галерее может быть не более ${GUIDE_MEDIA_LIMIT} изображений.`),
    format: t("请选择 JPEG、PNG 或 WebP 图片。", "Выберите JPEG, PNG или WebP."),
    "file-size": t("图片过大，请选择不超过 5MB 的图片或缩小后重试。", "Изображение слишком большое. Выберите файл до 5 МБ или уменьшите его."),
    dimensions: t("图片尺寸过大，请缩小到每边不超过 4096px 后重试。", "Уменьшите изображение до 4096 пикселей по каждой стороне и повторите."),
    decode: t("这张图片无法读取，请换一张。原图片未改变。", "Не удалось прочитать изображение. Выберите другое. Прежние изображения не изменены."),
    invalid: t("图片或说明无法保存，请检查内容后重试。", "Не удалось сохранить изображение или подпись. Проверьте содержимое."),
  };
  const carouselItems = custom ? media.images.map((image, imageIndex) => ({
    id: image.id,
    content: <div className="guide-gallery-slide guide-gallery-slide--photo">
      {/* Browser-local reencoded images cannot use a server-side image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} width={image.width} height={image.height} alt={image.caption || t(`自选图片 ${imageIndex + 1}`, `Ваше изображение ${imageIndex + 1}`)} draggable={false} />
    </div>,
  })) : fallbackSlides.map(slide => ({
    id: slide.id,
    content: <div className={`guide-gallery-slide guide-gallery-slide--${slide.kind}`}>
      <div className="guide-gallery-art" aria-hidden="true"><span className="guide-art-circle" />
        {slide.kind === "journey" ? <><div className="guide-art-student"><ClayStudent variant="curly" /></div><span className="guide-art-sticker"><MapPin size={36} strokeWidth={1.75} /></span></> : slide.kind === "documents" ? <><div className="guide-art-folder"><FolderOpen size={112} strokeWidth={1.25} /><FileText size={64} strokeWidth={1.5} /></div><span className="guide-art-sticker"><ListChecks size={36} strokeWidth={1.75} /></span></> : <><div className="guide-art-result"><CheckCheck size={96} strokeWidth={1.5} /></div><span className="guide-art-sticker"><Sparkles size={36} strokeWidth={1.75} /></span></>}
      </div>
    </div>,
  }));
  const manageControl = <button ref={manageButton} type="button" className="guide-gallery-manage material-glass material-glass--raised" aria-expanded={editing} aria-controls={`${id}-editor`} onClick={editing ? closeEditor : openEditor}><Images size={19} />{materials ? t(custom ? "管理图片" : "添加图片", custom ? "Изображения" : "Добавить") : t("管理图片", "Изображения")}</button>;
  const navigation = <div className="guide-gallery-navigation">
        <div className="guide-gallery-toolbar material-glass"><button type="button" className="icon-button" onClick={() => move(-1)} disabled={count < 2 || busy || index === 0} aria-label={t("上一张图片", "Предыдущее изображение")}><ArrowLeft size={20} /></button><span aria-live="polite">{index + 1} / {count}</span><button type="button" className="icon-button" onClick={() => move(1)} disabled={count < 2 || busy || index === count - 1} aria-label={t("下一张图片", "Следующее изображение")}><ArrowRight size={20} /></button></div>
        {materials && count > 1 && <span className="guide-material-swipe-hint">{t("左右滑动浏览", "Листайте влево и вправо")}</span>}
      </div>;
  return <div ref={gallery} className={`guide-gallery guide-gallery--editable${materials ? " guide-gallery--materials" : ""}`} role="group" aria-label={materials ? t("材料图片", "Изображения документов") : t("指南图片", "Изображения инструкции")}>
    {materials && <div className="guide-material-heading"><strong><FileText size={18} aria-hidden="true" />{t("材料图片", "Изображения документов")}</strong>{manageControl}</div>}
    {carouselItems.length > 0 ? <>
      <div className="guide-gallery-frame">
        <div className="guide-gallery-visual">
          <SwipeCarousel items={carouselItems} index={index} onIndexChange={next => { setSelected(next); setMessage(""); }} disabled={busy} label={t("左右滑动浏览图片", "Листайте изображения влево и вправо")} roledescription={t("图片轮播", "Карусель")} />
        </div>
        {!photo && fallback && <div className="guide-gallery-copy guide-gallery-static-copy"><span>STUDENTPATH / MOSCOW</span><strong>{fallback.title[locale]}</strong></div>}
        {!materials && photo?.caption && <p className="guide-gallery-caption material-glass material-glass--raised">{photo.caption}</p>}
        {!materials && manageControl}
        {!materials && navigation}
      </div>
      {materials && <p className="guide-material-caption" aria-live="polite">{photo?.caption || t(`图片 ${index + 1}`, `Изображение ${index + 1}`)}</p>}
      {materials && navigation}
    </> : fallbackContent}
    {editing && <section id={`${id}-editor`} className="guide-media-editor" aria-labelledby={`${id}-heading`} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeEditor(); } }}>
      <div className="guide-media-editor-heading"><h3 ref={editorHeading} tabIndex={-1} id={`${id}-heading`}>{materials ? t("这一步的材料图片", "Изображения этого шага") : t("这份指南的图片", "Изображения этой инструкции")}</h3><button type="button" className="icon-button" aria-label={t("关闭图片管理", "Закрыть редактор изображений")} onClick={closeEditor}><X size={20} /></button></div>
      <p>{t("添加你自己的图片，按顺序展示。只保存在当前浏览器。", "Добавьте свои изображения. Они хранятся только в этом браузере.")}</p>
      <p className="guide-media-limit">{t(`最多 ${GUIDE_MEDIA_LIMIT} 张 · JPEG / PNG / WebP · 每张不超过 5MB`, `До ${GUIDE_MEDIA_LIMIT} изображений · JPEG / PNG / WebP · До 5 МБ каждое`)}</p>
      <input ref={addInput} className="sr-only" type="file" tabIndex={-1} accept="image/jpeg,image/png,image/webp" multiple aria-label={materials ? t("添加材料图片", "Добавить изображения документов") : t("添加指南图片", "Добавить изображения инструкции")} onChange={event => void chooseFiles(event, false)} disabled={!media.hydrated || busy} />
      <input ref={replaceInput} className="sr-only" type="file" tabIndex={-1} accept="image/jpeg,image/png,image/webp" aria-label={t("替换当前指南图片", "Заменить текущее изображение")} onChange={event => void chooseFiles(event, true)} disabled={!media.hydrated || busy} />
      <div className="guide-media-actions"><button type="button" className="button primary" onClick={() => addInput.current?.click()} disabled={!media.hydrated || busy || media.images.length >= GUIDE_MEDIA_LIMIT}><ImagePlus size={18} />{t("添加图片", "Добавить")}</button><button type="button" className="button secondary" onClick={() => replaceInput.current?.click()} disabled={!media.hydrated || busy}><Images size={18} />{t("替换当前图片", "Заменить текущее")}</button></div>
      {custom && <>
        <div className="guide-media-thumbnails" role="group" aria-label={t("选择要编辑的图片", "Выберите изображение для редактирования")}>{media.images.map((image, imageIndex) => <button type="button" key={image.id} aria-label={t(`编辑第 ${imageIndex + 1} 张图片`, `Редактировать изображение ${imageIndex + 1}`)} aria-pressed={imageIndex === index} disabled={busy} onClick={() => { setSelected(imageIndex); setMessage(""); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt="" /><span>{imageIndex + 1}</span></button>)}</div>
        <form className="guide-media-caption-form" key={photo!.id} onSubmit={editCaption}><label htmlFor={`${id}-caption`}>{t("图片说明", "Подпись к изображению")}</label><textarea id={`${id}-caption`} name="caption" rows={2} maxLength={GUIDE_MEDIA_CAPTION_LIMIT} defaultValue={photo!.caption} disabled={busy} placeholder={t("例如：材料清单的参考样式", "Например: образец списка документов")} /><div className="guide-media-actions"><button type="submit" className="button secondary" disabled={busy}>{t("保存说明", "Сохранить подпись")}</button><button type="button" className="button secondary" disabled={busy} onClick={() => void removeCurrent()}><Trash2 size={18} />{t("移除这张图片", "Убрать изображение")}</button></div></form>
        {confirmReset ? <div className="guide-media-reset"><p>{materials ? t("移除这一步的全部图片，恢复材料示意？", "Убрать изображения этого шага и вернуть схему?") : t("移除这份指南的全部自选图片，恢复默认插画？", "Убрать все ваши изображения этой инструкции и вернуть иллюстрации?")}</p><div className="guide-media-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setConfirmReset(false)}>{t("取消", "Отмена")}</button><button type="button" className="button primary" disabled={busy} onClick={() => void restore()}>{t("恢复默认", "Восстановить")}</button></div></div> : <button className="guide-media-restore" type="button" disabled={busy} onClick={() => setConfirmReset(true)}><RotateCcw size={18} />{materials ? t("恢复材料示意", "Вернуть схему") : t("恢复默认插画", "Вернуть иллюстрации")}</button>}
      </>}
      {(!media.hydrated || message || media.storageUnavailable) && <p className="guide-media-status" role="status">{!media.hydrated ? t("正在读取图片…", "Загрузка изображений…") : messages[message] ?? (media.storageUnavailable ? messages.memory : "")}</p>}
    </section>}
  </div>;
}
