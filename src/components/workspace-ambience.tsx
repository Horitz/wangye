"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { MarginDrawing, type MarginDrawingKind } from "@/components/margin-drawing";
import { VoxelDecoration, type VoxelDecorationKind } from "@/components/voxel-decoration";
import { PixelCreature, type PixelCreatureKind } from "@/components/pixel-creature";
import { LandingNightSky } from "@/components/landing-night-sky";
import "@/app/page-ambience.css";
import "@/app/margin-art.css";

function sceneForPath(path: string) {
  if (path === "/") return "landing";
  if (path === "/dashboard") return "welcome";
  if (path === "/community") return "community";
  if (path.startsWith("/community/")) return "post";
  if (path === "/essentials") return "notice";
  if (path === "/me") return "personal";
  if (path === "/onboarding") return "onboarding";
  if (path.startsWith("/explore") || path.startsWith("/guides/")) return "guides";
  return "workspace";
}

type MarginScene = { left: [MarginDrawingKind, VoxelDecorationKind]; right: [MarginDrawingKind, MarginDrawingKind]; accent: VoxelDecorationKind; creature: PixelCreatureKind };
const marginScenes: Record<Exclude<ReturnType<typeof sceneForPath>, "landing">, MarginScene> = {
  welcome: { left: ["traveler", "grass"], right: ["reader", "plant"], accent: "mushroom", creature: "bee" },
  guides: { left: ["reader", "books"], right: ["traveler", "plant"], accent: "pickaxe", creature: "fox" },
  community: { left: ["camera", "mushroom"], right: ["headphones", "cat"], accent: "lantern", creature: "bee" },
  post: { left: ["camera", "lantern"], right: ["reader", "plant"], accent: "crystal", creature: "axolotl" },
  personal: { left: ["reader", "chest"], right: ["plant", "camera"], accent: "books", creature: "cat" },
  onboarding: { left: ["traveler", "grass"], right: ["plant", "cat"], accent: "mushroom", creature: "frog" },
  notice: { left: ["reader", "books"], right: ["traveler", "plant"], accent: "chest", creature: "fox" },
  workspace: { left: ["reader", "grass"], right: ["plant", "cat"], accent: "crystal", creature: "frog" },
};

function IllustratedMargins({ scene }: { scene: MarginScene }) {
  return <>
    <div className="ambience-margin ambience-margin--left">
      <div className="ambience-drawing ambience-drawing--star-one" data-kind="star" data-motion="paused"><SmallStar /></div>
      <div className="ambience-drawing ambience-art ambience-art--primary" data-kind={scene.left[0]} data-motion="paused">
        <MarginDrawing kind={scene.left[0]} />
        <VoxelDecoration kind={scene.left[1]} />
      </div>
      <div className="ambience-drawing ambience-art ambience-art--souvenir" data-kind={scene.left[1]} data-motion="paused"><VoxelDecoration kind={scene.left[1]} /></div>
      <div className="ambience-drawing ambience-art ambience-art--creature" data-kind={scene.creature} data-motion="paused"><PixelCreature kind={scene.creature} animated /></div>
    </div>
    <div className="ambience-margin ambience-margin--right">
      <div className="ambience-drawing ambience-drawing--star-two" data-kind="star" data-motion="paused"><SmallStar /></div>
      <div className="ambience-drawing ambience-art ambience-art--primary" data-kind={scene.right[0]} data-motion="paused">
        <MarginDrawing kind={scene.right[0]} />
        <VoxelDecoration kind={scene.accent} />
      </div>
      <div className="ambience-drawing ambience-art ambience-art--voxel-accent" data-kind={scene.accent} data-motion="paused"><VoxelDecoration kind={scene.accent} /></div>
      <div className="ambience-drawing ambience-art ambience-art--secondary" data-kind={scene.right[1]} data-motion="paused"><MarginDrawing kind={scene.right[1]} /></div>
    </div>
  </>;
}

function SmallStar() {
  return <svg className="ambience-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" />
  </svg>;
}

function SmallRocket() {
  return <svg className="ambience-rocket" viewBox="-8 0 80 80" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <path className="ambience-rocket-flame" d="M24 54h16v10h-4v10h-8V64h-4Z" />
    <path className="ambience-rocket-fin" d="M20 32h-8v8H8v16h16V32Zm24 0h8v8h4v16H40V32Z" />
    <path className="ambience-rocket-body" d="M28 6h8v8h4v8h4v34H20V22h4v-8h4Z" />
    <path className="ambience-rocket-tip" d="M28 6h8v8h4v8H24v-8h4Z" />
    <path className="ambience-rocket-window" d="M28 28h8v4h4v8h-4v4h-8v-4h-4v-8h4Z" />
    <path className="ambience-rocket-glint" d="M28 32h4v4h-4Z" />
    <path className="ambience-rocket-tip" d="M20 52h24v4H20Z" />
  </svg>;
}

/** Artwork belongs to the document; the landing sky stays outside the reading column. */
export function PageAmbience() {
  const pathname = usePathname();
  const scene = sceneForPath(pathname);
  const ambienceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const drawings = Array.from(ambienceRef.current?.querySelectorAll<HTMLElement>(".ambience-drawing") ?? []);
    const visible = new Set<Element>();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePlayback = () => {
      for (const drawing of drawings) {
        drawing.dataset.motion = visible.has(drawing) && document.visibilityState === "visible" && !preference.matches
          ? "running" : "paused";
      }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      updatePlayback();
    });
    drawings.forEach(drawing => observer?.observe(drawing));
    preference.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      observer?.disconnect();
      drawings.forEach(drawing => { drawing.dataset.motion = "paused"; });
      preference.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, [pathname]);

  return <div ref={ambienceRef} className="page-ambience" data-scene={scene} data-density={scene === "landing" ? "sparse" : "illustrated"} data-layout="document" aria-hidden="true">
    {scene !== "landing" ? <IllustratedMargins scene={marginScenes[scene]} /> : <>
    <LandingNightSky />
    <div className="landing-first-sky">
    <div className="ambience-margin ambience-margin--left">
      <div className="ambience-drawing ambience-drawing--star-one" data-kind="star" data-motion="paused"><SmallStar /></div>
      <div className="ambience-drawing ambience-drawing--voxel" data-kind="grass" data-motion="paused"><VoxelDecoration kind="grass" /></div>
      <div className="ambience-drawing ambience-drawing--star-three" data-kind="star" data-motion="paused"><SmallStar /></div>
    </div>
    <div className="ambience-margin ambience-margin--right">
      <div className="ambience-drawing ambience-drawing--star-two" data-kind="star" data-motion="paused"><SmallStar /></div>
      <div className="ambience-drawing ambience-drawing--rocket" data-kind="rocket" data-motion="paused"><SmallRocket /></div>
    </div>
    </div>
    </>}
  </div>;
}
