"use client";

import { useEffect, useRef } from "react";
import { CampusSketch } from "@/components/campus-sketch";

/** Only the illustration moves; the welcome copy and controls stay still. */
export function HubWelcomeCharacter() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const updatePlayback = () => {
      scene.dataset.motion = inView && document.visibilityState === "visible" && !reducedMotion.matches
        ? "running"
        : "paused";
    };
    // Unsupported observers leave the portrait static instead of running offscreen.
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updatePlayback();
    });

    observer?.observe(scene);
    document.addEventListener("visibilitychange", updatePlayback);
    reducedMotion.addEventListener("change", updatePlayback);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
      reducedMotion.removeEventListener("change", updatePlayback);
      scene.dataset.motion = "paused";
    };
  }, []);

  return <div className="hub-character hub-character--sketch" ref={sceneRef} data-motion="paused" aria-hidden="true">
    <div className="hub-sketch-paper"><CampusSketch /></div>
  </div>;
}
