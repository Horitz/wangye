"use client";

import { useRef, type KeyboardEvent } from "react";
import "@/app/morph-pagination.css";

/** Stable click targets; only the small glass marker changes shape. */
export function MorphPagination({ labels, activeIndex, onSelect, label, status }: {
  labels: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  label: string;
  status: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % labels.length
      : event.key === "ArrowLeft" ? (index + labels.length - 1) % labels.length
        : event.key === "Home" ? 0 : event.key === "End" ? labels.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(next);
    buttons.current[next]?.focus({ preventScroll: true });
  };
  return <div className="morph-pagination" role="group" aria-label={label}>
    {labels.map((item, index) => <button key={index} type="button"
      ref={element => { buttons.current[index] = element; }}
      className="morph-pagination-button" aria-label={item}
      aria-current={index === activeIndex ? "true" : undefined}
      onClick={() => onSelect(index)} onKeyDown={event => onKeyDown(event, index)}>
      <span className="morph-pagination-marker" aria-hidden="true" />
    </button>)}
    <span className="sr-only" aria-live="polite" aria-atomic="true">{status}</span>
  </div>;
}
