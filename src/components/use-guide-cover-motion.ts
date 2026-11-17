"use client";

import { useEffect, type RefObject } from "react";

/** Native scrolling moves the reading sheet; only the image receives subtle depth. */
export function useGuideCoverMotion(scrollRef: RefObject<HTMLDivElement | null>, coverRef: RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const scroll = scrollRef.current;
    const cover = coverRef.current;
    if (!scroll || !cover || !active) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let height = cover.clientHeight;
    const update = () => {
      frame = 0;
      const amount = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, scroll.scrollTop / Math.max(1, height)));
      cover.style.setProperty("--guide-cover-scale", String(1 + amount * .035));
      cover.style.setProperty("--guide-cover-blur", `${amount * 2}px`);
      cover.style.setProperty("--guide-cover-shade", String(amount * .12));
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => { height = cover.clientHeight; queue(); });
    resize?.observe(cover);
    scroll.addEventListener("scroll", queue, { passive: true });
    reducedMotion.addEventListener("change", queue);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      scroll.removeEventListener("scroll", queue);
      reducedMotion.removeEventListener("change", queue);
    };
  }, [scrollRef, coverRef, active]);
}
