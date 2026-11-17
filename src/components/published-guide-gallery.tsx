"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, MapPin, Maximize2 } from "lucide-react";
import { ClayStudent } from "@/components/clay-student";
import { SwipeCarousel } from "@/components/swipe-carousel";
import { GuideImageViewer } from "@/components/guide-image-viewer";
import type { GuideReaderSlide } from "@/data/guide-reader-content";
import type { GuideMediaImage } from "@/lib/guide-media-store";
import type { Locale } from "@/lib/home-store";

/** Published images are read in place; editing belongs to the document editor. */
export function PublishedGuideGallery({ images, locale, fallbackSlides = [], fallbackContent, variant = "cover", label }: {
  images: GuideMediaImage[];
  locale: Locale;
  fallbackSlides?: GuideReaderSlide[];
  fallbackContent?: ReactNode;
  variant?: "cover" | "materials";
  label?: string;
}) {
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false);
  const materials = variant === "materials";
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const photo = images[index];
  if (!images.length && (materials || (!fallbackSlides.length && !fallbackContent))) return null;
  const items = images.map((image, order) => ({
    id: image.id,
    content: <div className="guide-gallery-slide guide-gallery-slide--photo">
      {/* Published media has already been prepared for display. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} width={image.width} height={image.height} alt={image.caption || t(`图片 ${order + 1}`, `Изображение ${order + 1}`)} draggable={false} loading={materials || order !== index ? "lazy" : "eager"} decoding="async" />
    </div>,
  }));
  const controls = images.length > 1 && <div className="guide-gallery-toolbar material-glass">
    <button type="button" className="icon-button" disabled={index === 0} onClick={() => setSelected(index - 1)} aria-label={t("上一张图片", "Предыдущее изображение")}><ArrowLeft size={20} /></button>
    <span aria-live="polite">{index + 1} / {images.length}</span>
    <button type="button" className="icon-button" disabled={index === images.length - 1} onClick={() => setSelected(index + 1)} aria-label={t("下一张图片", "Следующее изображение")}><ArrowRight size={20} /></button>
  </div>;
  return <div className={`guide-gallery published-guide-gallery${images.length ? " published-guide-gallery--photos" : ""}${materials ? " guide-gallery--materials" : ""}`} role="group" aria-label={label ?? (materials ? t("材料图片", "Изображения документов") : t("指南图片", "Изображения инструкции"))}>
    <div className="guide-gallery-frame">
      <div className="guide-gallery-visual">
        {items.length ? <SwipeCarousel items={items} index={index} onIndexChange={setSelected} label={t("左右滑动浏览图片", "Листайте изображения влево и вправо")} roledescription={t("图片轮播", "Карусель")} /> : fallbackContent ?? <div className="guide-gallery-slide guide-gallery-slide--journey" aria-hidden="true"><div className="guide-gallery-art"><span className="guide-art-circle" /><div className="guide-art-student"><ClayStudent variant="curly" /></div><span className="guide-art-sticker"><MapPin size={36} strokeWidth={1.75} /></span></div></div>}
      </div>
      {!images.length && !fallbackContent && <div className="guide-gallery-copy guide-gallery-static-copy"><strong>{fallbackSlides[0].title[locale]}</strong></div>}
    </div>
    {photo && <div className="published-gallery-meta">
      {photo.caption && <p className="published-gallery-caption" aria-live="polite">{photo.caption}</p>}
      <div className="published-gallery-actions">{controls}<button type="button" className="guide-gallery-expand" onClick={() => setViewing(true)}><Maximize2 size={18} />{t("查看大图", "Увеличить")}</button></div>
    </div>}
    {viewing && <GuideImageViewer images={images} index={index} onIndexChange={setSelected} onClose={() => setViewing(false)} locale={locale} />}
  </div>;
}
