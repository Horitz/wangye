"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { getSwipeAxis, getSwipeOffset, resolveSwipeIndex, type SwipeAxis } from "@/lib/swipe-gesture";

export type SwipeCarouselItem = { id: string; content: ReactNode };
type Gesture = { pointerId: number; x: number; y: number; width: number; index: number; collection: string; axis: SwipeAxis };

const interactive = 'a, button, input, select, textarea, summary, [contenteditable="true"], [role="button"], [role="checkbox"], [role="tab"]';

/** A contained image rail. Controls and captions belong outside the moving rail. */
export function SwipeCarousel({ items, index, onIndexChange, label, roledescription, disabled = false, className = "" }: {
  items: SwipeCarouselItem[];
  index: number;
  onIndexChange: (index: number) => void;
  label: string;
  roledescription?: string;
  disabled?: boolean;
  className?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ offset: number; index: number; collection: string } | null>(null);
  const selected = Math.max(0, Math.min(index, Math.max(0, items.length - 1)));
  const collection = items.map(item => item.id).join("\u0000");
  const enabled = !disabled && items.length > 1;
  const activeDrag = enabled && drag?.index === selected && drag.collection === collection ? drag : null;

  function release(element: HTMLDivElement, pointerId: number) {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  }
  function reset(element: HTMLDivElement) {
    const previous = gesture.current;
    gesture.current = null;
    setDrag(null);
    if (previous) release(element, previous.pointerId);
  }
  function select(next: number) {
    if (next === selected) return;
    const focused = document.activeElement;
    if (focused && focused !== viewport.current && viewport.current?.contains(focused)) viewport.current.focus({ preventScroll: true });
    onIndexChange(next);
  }
  function down(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    if (!event.isPrimary) { reset(event.currentTarget); return; }
    if (!enabled || event.button !== 0 || (event.target instanceof Element && event.target.closest(interactive))) return;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, width: event.currentTarget.clientWidth, index: selected, collection, axis: null };
    // Mouse movement can leave the image before direction is clear; capture is not scroll prevention.
    if (event.pointerType === "mouse") event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!enabled || current.index !== selected || current.collection !== collection || current.width !== event.currentTarget.clientWidth) { reset(event.currentTarget); return; }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    current.axis ??= getSwipeAxis(dx, dy);
    if (current.axis === "vertical") { reset(event.currentTarget); return; }
    if (current.axis !== "horizontal") return;
    event.preventDefault();
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    suppressClick.current = true;
    setDrag({ offset: getSwipeOffset(selected, items.length, dx, current.width), index: selected, collection });
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const next = enabled && current.axis === "horizontal" && current.index === selected && current.collection === collection
      ? resolveSwipeIndex(selected, items.length, event.clientX - current.x, current.width) : selected;
    reset(event.currentTarget);
    select(next);
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    let next = selected;
    if (event.key === "ArrowLeft") next = Math.max(0, selected - 1);
    else if (event.key === "ArrowRight") next = Math.min(items.length - 1, selected + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    reset(event.currentTarget);
    select(next);
  }

  if (!items.length) return null;
  return <div ref={viewport} className={`swipe-carousel ${className}`} role="group" aria-roledescription={roledescription} aria-label={label} tabIndex={enabled ? 0 : undefined}
    data-swipe-enabled={enabled ? "true" : undefined} data-dragging={activeDrag ? "true" : undefined}
    onPointerDown={down} onPointerMove={move} onPointerUp={up}
    onPointerCancel={event => { if (gesture.current?.pointerId === event.pointerId) reset(event.currentTarget); }}
    onLostPointerCapture={event => { if (gesture.current?.pointerId === event.pointerId) reset(event.currentTarget); }}
    onDragStart={event => event.preventDefault()}
    onClickCapture={event => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); } }}
    onKeyDown={key}>
    <div className="swipe-carousel-track" style={{ transform: `translate3d(calc(${-selected * 100}% + ${activeDrag?.offset ?? 0}px), 0, 0)` }}>
      {items.map((item, itemIndex) => <div key={item.id} className="swipe-carousel-slide" inert={itemIndex !== selected} aria-hidden={itemIndex !== selected}>{item.content}</div>)}
    </div>
  </div>;
}
