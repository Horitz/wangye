"use client";

import { useEffect, useRef } from "react";
import "@/app/guidance-illustration.css";

export type GuidanceIllustrationKind = "route" | "book" | "pencil" | "plan" | "search" | "chat" | "coffee";

type GuidanceIllustrationProps = {
  kind: GuidanceIllustrationKind;
  className?: string;
  animated?: boolean;
  /** A decorative accent for an actually completed, non-empty personal plan. */
  complete?: boolean;
};

function RouteDrawing() {
  return <>
    <path className="guidance-ground" d="M31 142q37-3 60-1m15 0 42-2" />
    <path className="guidance-paper" d="m32 76 37-12 41 13 36-11 10 65-40 13-39-12-37 11Z" />
    <path className="guidance-map-tint" d="m69 65 41 13 6 65-39-12Z" />
    <path className="guidance-fine" d="m69 67 8 63m33-50 6 60" />
    <path className="guidance-map-water" d="M36 113c19-15 23 2 42-6s20-22 36-16 15 14 32 8" />
    <path className="guidance-route-line" d="M53 126c14-20 39 9 43-10s-15-15-5-29" />
    <circle className="guidance-gold" cx="53" cy="126" r="4" />
    <path className="guidance-gold" d="M91 72c-9 0-13 10-8 17l9 10 8-11c5-8 0-16-9-16Z" />
    <circle className="guidance-paper" cx="91" cy="82" r="3" />
    <path className="guidance-fine" d="m46 88 10-3m-9 9 10-3m72 29 10-4m-9 10 10-3" />
    <path className="guidance-trail" d="M29 57c11-16 46-18 50-1 3 15-22 16-21 3 1-11 27-14 48-13" />
    <g className="guidance-moving guidance-plane">
      <path className="guidance-paper" d="m108 38 60-18-22 48-13-18Z" />
      <path className="guidance-lilac" d="m133 50 35-30-25 40-8 3Z" />
      <path className="guidance-fine" d="m135 63 9-6m-11-7-25-12" />
    </g>
    <path className="guidance-fine guidance-small-lines" d="m43 35-2-6m9 4 1-5m113 73 5-4m-4 12 7-1" />
  </>;
}

function BookDrawing() {
  return <>
    <path className="guidance-ground" d="M36 140q32-2 61 0m13 1 52-3" />
    <path className="guidance-lilac" d="M31 64q35-10 67 8 28-19 67-12l3 72q-40-4-69 9-32-13-66-7Z" />
    <path className="guidance-paper" d="M36 57q34-8 62 11 29-17 61-13l4 70q-34-3-64 11-29-15-61-10Z" />
    <path className="guidance-fine" d="m98 69 1 65m-58-5q33-4 56 10m7-1q27-11 56-10" />
    <path className="guidance-teal" d="m119 60 12-3 1 30-7-5-6 6Z" />
    <path className="guidance-fine" d="m47 72 18 1m-18 7 31 2m-30 7 21 2m58 9 21-3m-23 11 24-3m-25 12 18-2" />
    <g className="guidance-moving guidance-book-page">
      <path className="guidance-paper" d="M99 69q16-22 40-26l-1 56q-22 7-38 34Z" />
      <path className="guidance-fine" d="m111 70 18-12m-18 22 18-12m-18 22 12-8" />
    </g>
    <path className="guidance-gold" d="m45 98 24 4-1 15-24-5Z" />
    <path className="guidance-fine" d="m51 106 11 2" />
    <g className="guidance-moving guidance-book-spark">
      <path className="guidance-gold" d="m57 25 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" />
      <path className="guidance-fine" d="m73 29 4-5m1 13 6-1" />
    </g>
    <path className="guidance-fine guidance-small-lines" d="m166 45 5-5m-2 13 7-1m-153 53 5 1m-2-10 5 3" />
  </>;
}

function PencilDrawing() {
  return <>
    <path className="guidance-ground" d="M40 143q31-3 60-1m11-1 45-1" />
    <path className="guidance-lilac" d="m50 37 89 7-4 94-88-4Z" />
    <path className="guidance-paper" d="m56 30 88 7-4 94-88-5Z" />
    <path className="guidance-teal" d="m71 29 41 3-1 11-41-4Z" />
    <path className="guidance-fine" d="m67 57 49 4m-49 7 33 2m-35 38 31 2m-31 8 42 2" />
    <path className="guidance-ink-line" d="M69 93c8-12 1 11 9 0s2 11 12-1 5 10 16-2" />
    <g className="guidance-moving guidance-pencil">
      <path className="guidance-gold" d="m113 89 29-57 12 7-30 57-17 11Z" />
      <path className="guidance-paper" d="m113 89 11 7-17 11Z" />
      <path className="guidance-ink" d="m110 99 5 3-8 5Z" />
      <path className="guidance-lilac" d="m142 32 5-9q2-4 6-2l5 3q4 2 1 6l-5 9Z" />
      <path className="guidance-fine" d="m141 36 12 6m-33 46 23-44m-29 47 8 4" />
    </g>
    <g className="guidance-moving guidance-pencil-spark">
      <path className="guidance-fine" d="m31 65 8 3m-4-14 6 6m-13 16 9-1" />
    </g>
    <path className="guidance-pink" d="m156 113 7-5 8 4-1 9-9 3-6-6Z" />
    <path className="guidance-fine guidance-small-lines" d="m162 92 5 1m-3-4-1 7m-131 22 5 4" />
  </>;
}

function SearchDrawing() {
  return <>
    <path className="guidance-ground" d="M25 141q56-3 142 0" />
    <path className="guidance-paper" d="m30 53 44-14 42 11 36-10 10 84-39 12-43-11-40 14Z" />
    <path className="guidance-map-tint" d="m75 40 41 11 7 84-43-11Z" />
    <path className="guidance-fine" d="m75 42 5 81m37-71 6 81m-79-59 15-4m-15 12 16-4m76 25 12-3m-11 11 12-3" />
    <path className="guidance-route-line" d="M50 118c3-17 22-7 26-20s22-7 24-26" />
    <circle className="guidance-gold" cx="50" cy="118" r="4" />
    <g className="guidance-moving guidance-search-lens">
      <path className="guidance-lilac" d="m134 91 22 22q5 7-2 12-5 3-9-2l-22-24Z" />
      <circle className="guidance-paper" cx="114" cy="70" r="32" />
      <circle className="guidance-map-tint" cx="114" cy="70" r="25" />
      <path className="guidance-gold" d="M114 52c-10 0-16 11-10 20l10 12 10-12c6-9 0-20-10-20Z" />
      <circle className="guidance-paper" cx="114" cy="63" r="4" />
      <path className="guidance-fine" d="m95 63 4-7m30 33 4-5" />
    </g>
    <path className="guidance-fine guidance-small-lines" d="m42 34-4-8m14 4 2-9m108 31 7-3m-6 13 9 1" />
  </>;
}

function ChatDrawing() {
  return <>
    <path className="guidance-ground" d="M32 143q38-3 131-1" />
    <path className="guidance-lilac" d="M85 67q37-7 79-1l4 52-25 1-19 17-1-16-34-2Z" />
    <path className="guidance-fine" d="m102 89 43-1m-42 10 30-1" />
    <g className="guidance-moving guidance-chat-bubble">
      <path className="guidance-paper" d="M26 33q48-9 105 0l3 60-55 3-25 21 1-22-26-4Z" />
      <path className="guidance-teal" d="m41 44 34-2 1 9-34 2Z" />
      <ellipse className="guidance-ink" cx="58" cy="67" rx="2.5" ry="4" />
      <ellipse className="guidance-ink" cx="102" cy="65" rx="2.5" ry="4" />
      <path className="guidance-fine" d="M72 77q9 9 18-1" />
      <path className="guidance-cheek" d="m48 78 7 1m49-3 7-1" />
    </g>
    <path className="guidance-gold" d="m158 26 4 10 11 2-9 7 2 11-9-6-10 5 2-11-8-7 11-1Z" />
    <path className="guidance-fine guidance-small-lines" d="m18 107-7 1m10 7-4 6m154-36 7-3m-6 12 7 2" />
  </>;
}

function CoffeeDrawing() {
  return <g className="guidance-pixel" shapeRendering="crispEdges">
    <path className="guidance-pixel-shadow" d="M38 136h126v6H38Z" />
    <path className="guidance-pixel-ink" d="M40 61h103v12h20v9h10v31h-10v9h-29v10h-9v8H59v-8h-9v-12H40Z" />
    <path className="guidance-pixel-paper" d="M49 70h85v44h-9v15H59v-15H49Zm94 13v29h13v-9h8V91h-8v-8Z" />
    <path className="guidance-pixel-teal" d="M49 81h85v31h-9v11H59v-11H49Z" />
    <path className="guidance-pixel-ink" d="M67 91h6v8h-6Zm42 0h6v8h-6ZM83 105h19v5H83Z" />
    <g className="guidance-moving guidance-coffee-steam">
      <path className="guidance-pixel-ink" d="M64 48V36h7V23h7v15h-7v10Zm28 2V36h7V18h7v20h-7v12Zm28-2V35h7V25h7v13h-7v10Z" />
    </g>
    <path className="guidance-pixel-gold" d="M25 29h7v7h7v7h-7v7h-7v-7h-7v-7h7Zm137-3h6v6h6v6h-6v6h-6v-6h-6v-6h6Z" />
  </g>;
}

function PlanDrawing({ complete }: { complete: boolean }) {
  return <>
    <path className="guidance-ground" d="M38 143q30-3 65-1m14-1 39-1" />
    <path className="guidance-teal" d="m55 32 76-5q9-1 10 8l5 91q0 10-9 10l-76 5q-8 0-9-7l-6-91q-1-10 9-11Z" />
    <path className="guidance-paper" d="m66 32 63-4q7 0 8 7l5 91q0 6-7 7l-63 3Z" />
    <path className="guidance-fine" d="m67 34 5 101m-19-80c-13-2-13-11-1-12m2 36c-13-2-14-11-1-12m3 36c-13-2-14-11-2-12m3 36c-12-2-13-11-1-12" />
    <path className="guidance-gold" d="m79 44 35-2 1 11-35 2Z" />
    <path className="guidance-fine" d="m82 114 37-2m-36 10 24-2" />
    <g className="guidance-moving guidance-plan-eyes">
      <ellipse className="guidance-ink" cx="88" cy="77" rx="2.1" ry="3.3" />
      <ellipse className="guidance-ink" cx="114" cy="75" rx="2.1" ry="3.3" />
    </g>
    <path className="guidance-fine" d="M91 89q12 10 22-2" />
    <path className="guidance-cheek" d="m80 86 5 1m33-3 5-1" />
    <g className="guidance-moving guidance-plan-wave">
      <path className="guidance-ink-line" d="M144 96q17-3 18-20m-5-5 5 5 4-5m-4 4-1-9" />
    </g>
    {complete ? <g className="guidance-moving guidance-plan-star">
      <path className="guidance-gold" d="m159 25 4 9 10 1-8 7 2 11-9-5-9 6 1-11-8-6 11-2Z" />
      <path className="guidance-fine" d="m147 19-2-5m28 15 5-2m-12 33 2 5" />
    </g> : <path className="guidance-lilac" d="m153 34 12-2 1 13-6-2-6 4Z" />}
    <path className="guidance-fine guidance-small-lines" d="m29 69 7 2m-5 6 5-1m121 46 6 3m-8 4 5 6" />
  </>;
}

/** Small visual companions; they never write progress or replace an action. */
export function GuidanceIllustration({ kind, className = "", complete = false, animated = true }: GuidanceIllustrationProps) {
  const illustrationRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!animated) return;
    const illustration = illustrationRef.current;
    if (!illustration) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const updatePlayback = () => {
      illustration.dataset.motion = inView && document.visibilityState === "visible" && !preference.matches ? "running" : "paused";
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updatePlayback();
    });
    observer?.observe(illustration);
    preference.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      observer?.disconnect();
      illustration.dataset.motion = "paused";
      preference.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, [animated]);

  return <span ref={illustrationRef} className={`guidance-illustration guidance-illustration--${kind} ${className}`} data-motion="paused" aria-hidden="true">
    <svg viewBox="0 0 200 160" fill="none" focusable="false" aria-hidden="true">
      {kind === "route" ? <RouteDrawing /> : kind === "book" ? <BookDrawing /> : kind === "pencil" ? <PencilDrawing /> : kind === "search" ? <SearchDrawing /> : kind === "chat" ? <ChatDrawing /> : kind === "coffee" ? <CoffeeDrawing /> : <PlanDrawing complete={complete} />}
    </svg>
  </span>;
}
