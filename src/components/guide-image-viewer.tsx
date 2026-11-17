"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut } from "lucide-react";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { SwipeCarousel } from "@/components/swipe-carousel";
import type { GuideMediaImage } from "@/lib/guide-media-store";
import type { Locale } from "@/lib/home-store";

/** A same-page, full-size gallery. Zoomed images scroll without changing slides. */
export function GuideImageViewer({ images, index, onIndexChange, onClose, locale }: {
  images: GuideMediaImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  locale: Locale;
}) {
  const [zoom, setZoom] = useState(1);
  const pan = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const photo = images[index];
  function select(next: number) { setZoom(1); onIndexChange(next); }
  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (zoom === 1 || event.pointerType !== "mouse" || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    pan.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePan(event: PointerEvent<HTMLDivElement>) {
    const drag = pan.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.left + drag.x - event.clientX;
    event.currentTarget.scrollTop = drag.top + drag.y - event.clientY;
  }
  function endPan(event: PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointer !== event.pointerId) return;
    pan.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <WorkspaceDialog open onClose={onClose} variant="image" title={t("图片查看", "Просмотр изображений")} headerActions={
    <div className="guide-image-zoom-tools">
      <button className="icon-button" type="button" disabled={zoom === 1} onClick={() => setZoom(Math.max(1, zoom - 1))} aria-label={t("缩小图片", "Уменьшить изображение")}><ZoomOut size={20} /></button>
      <button className="guide-image-reset" type="button" onClick={() => setZoom(1)} aria-label={t("恢复完整图片", "Показать целиком")}>{zoom === 1 ? t("适应", "Вписать") : `${zoom}×`}</button>
      <button className="icon-button" type="button" disabled={zoom === 4} onClick={() => setZoom(Math.min(4, zoom + 1))} aria-label={t("放大图片", "Увеличить изображение")}><ZoomIn size={20} /></button>
    </div>
  }>
    <div className="guide-image-viewer">
      <div className="guide-image-stage">
        <SwipeCarousel items={images.map((image, order) => ({ id: image.id, content:
          <div key={`${image.id}-${zoom}`} className="guide-image-pan" data-zoomed={zoom > 1 ? "true" : undefined} tabIndex={zoom > 1 && order === index ? 0 : undefined} aria-label={t("滚动查看放大的图片", "Прокрутите увеличенное изображение")}
            style={{ "--image-ratio": image.width / image.height, "--image-zoom": zoom } as CSSProperties}
            onDoubleClick={() => setZoom(zoom === 1 ? 2 : 1)} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}>
            <div className="guide-image-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} width={image.width} height={image.height} alt={image.caption || t(`图片 ${order + 1}`, `Изображение ${order + 1}`)} draggable={false} loading={order === index ? "eager" : "lazy"} decoding="async" />
            </div>
          </div>
        }))} index={index} onIndexChange={select} disabled={zoom > 1} label={t("左右滑动浏览大图", "Листайте большие изображения")} roledescription={t("图片轮播", "Карусель")} />
      </div>
      <footer className="guide-image-footer">
        {photo.caption && <p aria-live="polite">{photo.caption}</p>}
        <div className="guide-image-pagination">
          <button type="button" className="icon-button" disabled={index === 0} onClick={() => select(index - 1)} aria-label={t("上一张图片", "Предыдущее изображение")}><ArrowLeft size={20} /></button>
          <span aria-live="polite">{index + 1} / {images.length}</span>
          <button type="button" className="icon-button" disabled={index === images.length - 1} onClick={() => select(index + 1)} aria-label={t("下一张图片", "Следующее изображение")}><ArrowRight size={20} /></button>
        </div>
      </footer>
    </div>
  </WorkspaceDialog>;
}
