"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DragonLandmark } from "./dragon-landmarks";

type Point = { x: number; y: number };
const home: Point = { x: 1, y: .91 };
const positionKey = "studentpath:dragon-position:v1";
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

export function useCompanionPosition(onTouchTap: () => void, onLift: () => void, onLand: (target: DragonLandmark) => void) {
  const field = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; start: Point; origin: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [near, setNear] = useState<DragonLandmark | null>(null);
  const keyboardTarget = useRef<DragonLandmark | null>(null);
  const [point, setPoint] = useState(home);
  const [size, setSize] = useState({ w: 0, h: 0, buttonW: 0, buttonH: 0 });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(positionKey) ?? "null");
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPoint({ x: clamp(saved.x, 1), y: clamp(saved.y, 1) });
      } catch { /* Storage can be unavailable in private browsing. */ }
    });
    const area = field.current!, button = trigger.current!;
    function measure() {
      setSize({ w: area.clientWidth, h: area.clientHeight, buttonW: button.offsetWidth, buttonH: button.offsetHeight });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(button);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const travelX = Math.max(0, size.w - size.buttonW), travelY = Math.max(0, size.h - size.buttonH);
  const x = point.x * travelX, y = point.y * travelY;
  function place(px: number, py: number, save: boolean) {
    const next = { x: travelX ? clamp(px / travelX, 1) : point.x, y: travelY ? clamp(py / travelY, 1) : point.y };
    setPoint(next);
    if (save) {
      try { localStorage.setItem(positionKey, JSON.stringify(next)); } catch { /* The current position still works. */ }
    }
  }
  function approach(px: number, py: number, finish: boolean, pointer?: Point) {
    const area = field.current!.getBoundingClientRect();
    const center = { x: area.left + clamp(px, travelX) + size.buttonW / 2, y: area.top + clamp(py, travelY) + size.buttonH / 2 };
    const targets = field.current!.closest(".student-hub")!.querySelectorAll<HTMLElement>("[data-dragon-target]");
    for (const target of targets) {
      const box = target.getBoundingClientRect();
      const hits = (p: Point) => p.x >= box.left - 6 && p.x <= box.right + 6 && p.y >= box.top - 6 && p.y <= box.bottom + 6;
      if (!box.width || box.bottom < area.top || box.top > area.bottom || !(hits(center) || (pointer && hits(pointer)))) continue;
      const kind = target.dataset.dragonTarget as DragonLandmark;
      setNear(finish ? null : kind);
      if (finish) {
        const perch = kind === "castle" ? box.top + box.height * .48 - size.buttonH : box.top + (box.height - size.buttonH) / 2;
        place(box.left + (box.width - size.buttonW) / 2 - area.left, perch - area.top, true);
        onLand(kind);
      }
      return kind;
    }
    setNear(null);
    return null;
  }
  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: { x, y }, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>, finish: boolean) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.id) return;
    const dx = event.clientX - g.start.x, dy = event.clientY - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) >= 6) { g.moved = true; onLift(); }
    if (g.moved) {
      suppressClick.current = true;
      place(g.origin.x + dx, g.origin.y + dy, finish);
      approach(g.origin.x + dx, g.origin.y + dy, finish, { x: event.clientX, y: event.clientY });
    }
    if (finish) gesture.current = null;
    return !g.moved;
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const offsets: Record<string, [number, number]> = { ArrowUp: [0, -24], ArrowDown: [0, 24], ArrowLeft: [-24, 0], ArrowRight: [24, 0] };
    if (!offsets[event.key]) return;
    event.preventDefault();
    const [dx, dy] = offsets[event.key];
    onLift();
    place(x + dx, y + dy, true);
    keyboardTarget.current = approach(x + dx, y + dy, false);
  }
  return { field, trigger, x, y, size, near, suppressClick, gesture, handlers: {
    onPointerDown, onPointerMove: (e: PointerEvent<HTMLButtonElement>) => move(e, false),
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      const tapped = move(e, true);
      if (tapped && e.pointerType === "touch") {
        suppressClick.current = true;
        e.preventDefault();
        onTouchTap();
      }
    },
    onLostPointerCapture: () => { gesture.current = null; setNear(null); }, onKeyDown,
    onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key.startsWith("Arrow") && keyboardTarget.current) {
        keyboardTarget.current = null;
        approach(x, y, true);
      }
    },
  } };
}
