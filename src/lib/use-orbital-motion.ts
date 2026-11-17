"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Move decorative portraits and objects together; stop when reduced, hidden or offscreen. */
export function useOrbitalMotion(scene: RefObject<HTMLDivElement | null>) {
  const elapsed = useRef(0);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const items = Array.from(element.querySelectorAll<HTMLElement>("[data-orbit-phase]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const duration = parseFloat(getComputedStyle(element).getPropertyValue("--orbit-duration")) * 1000 || 64000;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let frame = 0;
    let previous = 0;
    let visible = element.getBoundingClientRect().bottom > 0 && element.getBoundingClientRect().top < innerHeight;
    const tilt = -18 * Math.PI / 180;

    const paint = () => {
      for (const item of items) {
        const angle = elapsed.current / duration * Math.PI * 2 + Number(item.dataset.orbitPhase) * Math.PI / 180;
        const depth = Math.sin(angle);
        const person = item.dataset.orbitKind === "person";
        const x = Math.cos(angle) * width * .4;
        const y = depth * height * .36;
        const offsetX = x * Math.cos(tilt) - y * Math.sin(tilt);
        const offsetY = x * Math.sin(tilt) + y * Math.cos(tilt);
        const scale = person ? .95 + depth * .09 : .97 + depth * .11;
        const sway = Math.cos(angle) * (person ? 6 : 8);
        item.style.transform = `translate(-50%, -50%) translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, 0) scale(${scale.toFixed(3)}) rotate(${sway.toFixed(2)}deg)`;
        item.style.zIndex = depth > 0 ? "8" : "2";
        item.style.opacity = person ? "1" : String(.94 + depth * .06);
      }
    };
    const canRun = () => !reduced.matches && visible && !document.hidden;
    const tick = (time: number) => {
      frame = 0;
      if (!canRun()) return;
      if (previous) elapsed.current += Math.min(64, time - previous);
      previous = time;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      element.setAttribute("data-running", String(canRun()));
      paint();
      if (canRun()) frame = requestAnimationFrame(tick);
    };
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const sizes = new ResizeObserver(() => { width = element.clientWidth; height = element.clientHeight; paint(); });
    visibility.observe(element);
    sizes.observe(element);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      visibility.disconnect();
      sizes.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [scene]);
}
