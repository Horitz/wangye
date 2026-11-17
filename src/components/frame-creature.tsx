"use client";

import { useEffect, useRef } from "react";
import { PixelCreature, type PixelCreatureKind } from "@/components/pixel-creature";
import "@/app/playful-frames.css";

type FrameCreatureProps = {
  kind: PixelCreatureKind;
  placement?: "top-right" | "top-left" | "side-right";
  className?: string;
};

/** Attach to a positioned, unclipped panel; only its decorative parts move. */
export function FrameCreature({ kind, placement = "top-right", className = "" }: FrameCreatureProps) {
  const scene = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      element.dataset.motion = visible && document.visibilityState === "visible" && !preference.matches ? "running" : "paused";
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer?.observe(element);
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer?.disconnect();
      element.dataset.motion = "paused";
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <span ref={scene} className={`frame-creature frame-creature--${placement} ${className}`} data-motion="paused" aria-hidden="true"><PixelCreature kind={kind} animated /></span>;
}
