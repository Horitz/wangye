import type { ReactNode } from "react";

export type PixelMarginDrawingKind = "cloud" | "star" | "ship" | "cat" | "backpack" | "planet";

const drawings: Record<PixelMarginDrawingKind, ReactNode> = {
  cloud: <>
    <path className="pixel-margin-soft" d="M8 51h48v4H8zM16 59h32v4H16z" />
    <path className="pixel-margin-ink" d="M8 29h4v-8h8v-8h20v4h8v8h8v8h4v12H4V33h4z" />
    <path className="pixel-margin-paper" d="M8 33h8V23h8v-6h12v4h8v8h8v8h4v4H8z" />
    <path className="pixel-margin-lilac" d="M8 37h12v4h24v-4h12v4H8zM16 25h8v4h-8z" />
    <path className="pixel-margin-ink" d="M24 29h4v4h-4zM36 29h4v4h-4zM28 37h8v4h-8z" />
    <path className="pixel-margin-pink" d="M16 33h8v4h-8zM40 33h8v4h-8z" />
    <path className="pixel-margin-gold" d="M48 9h4v4h4v4h-4v4h-4v-4h-4v-4h4zM8 9h4v4H8z" />
  </>,
  star: <>
    <path className="pixel-margin-soft" d="M20 61h28v4H20z" />
    <path className="pixel-margin-ink" d="M28 9h8v8h4v8h16v8h-4v8h-8v16h-8v-4h-8v4H16V41H8v-8H4v-8h20v-8h4z" />
    <path className="pixel-margin-gold" d="M28 13h4v8h4v8h16v4h-4v4h-8v16h-4v-4H24v4h-4V37h-8v-4H8v-4h20z" />
    <path className="pixel-margin-paper" d="M28 25h4v8h-4zM16 33h8v4h-8z" />
    <path className="pixel-margin-ink" d="M24 33h4v8h-4zM36 33h4v8h-4zM28 41h8v4h-8z" />
    <path className="pixel-margin-pink" d="M20 41h4v4h-4zM40 41h4v4h-4z" />
    <path className="pixel-margin-teal" d="M4 9h4v4h4v4H8v4H4v-4H0v-4h4zM52 53h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
  </>,
  ship: <>
    <g className="pixel-margin-motion pixel-margin-flame">
      <path className="pixel-margin-gold" d="M24 48h16v12h-4v8h-8v-8h-4z" />
      <path className="pixel-margin-pink" d="M28 48h8v12h-8z" />
      <path className="pixel-margin-paper" d="M28 48h8v4h-8z" />
    </g>
    <path className="pixel-margin-ink" d="M28 4h8v4h4v8h4v12h8v8h4v16H40v4H24v-4H8V36h4v-8h8V16h4V8h4z" />
    <path className="pixel-margin-lilac" d="M16 32h8v16H12V36h4zM40 32h8v4h4v12H40z" />
    <path className="pixel-margin-paper" d="M28 12h8v8h4v28H24V20h4z" />
    <path className="pixel-margin-pink" d="M28 12h8v8h-8zM24 44h16v4H24z" />
    <path className="pixel-margin-ink" d="M28 24h8v4h4v8h-4v4h-8v-4h-4v-8h4z" />
    <path className="pixel-margin-teal" d="M28 28h8v8h-8z" />
    <path className="pixel-margin-paper" d="M28 28h4v4h-4z" />
    <path className="pixel-margin-gold" d="M8 8h4v4h4v4h-4v4H8v-4H4v-4h4zM52 20h4v4h-4z" />
  </>,
  cat: <>
    <path className="pixel-margin-soft" d="M8 64h48v4H8z" />
    <path className="pixel-margin-ink" d="M8 52h44v12H8z" />
    <path className="pixel-margin-lilac" d="M12 52h36v4H12zM12 60h36v4H12z" />
    <path className="pixel-margin-paper" d="M16 56h36v4H16z" />
    <g className="pixel-margin-motion pixel-margin-tail">
      <path className="pixel-margin-ink" d="M48 40h8v-8h8v16h-8v8H44V44h4z" />
      <path className="pixel-margin-gold" d="M48 44h8v-8h4v8h-4v8h-8z" />
    </g>
    <path className="pixel-margin-ink" d="M12 16h8v4h4v4h12v-4h4v-4h8v32h-4v8H12V44H8V24h4z" />
    <path className="pixel-margin-gold" d="M16 24h4v4h20v-4h4v20h-4v8H16V40h-4V28h4z" />
    <path className="pixel-margin-pink" d="M16 20h4v8h-4zM40 20h4v8h-4zM28 36h8v4h-8z" />
    <path className="pixel-margin-ink" d="M16 32h8v4h-8zM36 32h8v4h-8zM28 40h4v4h-4z" />
    <path className="pixel-margin-paper" d="M20 48h8v4h-8zM32 48h8v4h-8z" />
    <path className="pixel-margin-teal" d="M4 8h8v4H4zM4 12h4v4H4zM0 16h8v4H0z" />
  </>,
  backpack: <>
    <path className="pixel-margin-soft" d="M12 64h44v4H12z" />
    <path className="pixel-margin-ink" d="M24 8h16v4h4v8h8v8h4v28h-4v4H12v-4H8V28h4v-8h8v-8h4z" />
    <path className="pixel-margin-paper" d="M24 12h16v8H24z" />
    <path className="pixel-margin-teal" d="M16 24h32v4h4v24h-4v4H16v-4h-4V28h4z" />
    <path className="pixel-margin-lilac" d="M16 24h32v8H16zM12 40h4v12h-4zM48 40h4v12h-4z" />
    <path className="pixel-margin-ink" d="M20 36h24v16H20z" />
    <path className="pixel-margin-pink" d="M24 40h16v8H24z" />
    <path className="pixel-margin-paper" d="M28 40h8v4h-8z" />
    <path className="pixel-margin-gold" d="M28 28h8v8h-8zM52 8h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
    <path className="pixel-margin-ink" d="M4 28h4v4H4zM56 28h4v4h-4z" />
  </>,
  planet: <>
    <path className="pixel-margin-soft" d="M20 64h28v4H20z" />
    <path className="pixel-margin-ink" d="M24 12h16v4h8v8h4v24h-4v8h-8v4H24v-4h-8v-8h-4V24h4v-8h8z" />
    <path className="pixel-margin-lilac" d="M24 16h16v4h8v28h-4v4h-8v4H24v-4h-8V24h4v-4h4z" />
    <path className="pixel-margin-pink" d="M20 24h12v4H20zM28 44h16v4H28z" />
    <path className="pixel-margin-paper" d="M24 20h8v4h-8z" />
    <path className="pixel-margin-ink" d="M52 24h8v4h4v12h-8v4h-8v4H28v4H12v-4H4v-4H0V32h8v-4h8v8H8v4h8v4h12v-4h20v-4h8v-4h-4z" />
    <path className="pixel-margin-teal" d="M4 36h4v8h8v4h12v-4h20v-4h8v-4h4v-8h-4v8h-8v4H28v4H16v-4H8v-8H4z" />
    <path className="pixel-margin-gold" d="M8 8h4v4h4v4h-4v4H8v-4H4v-4h4zM52 56h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
  </>,
};

/** Small pixel souvenirs, drawn on one shared grid and palette. */
export function PixelMarginDrawing({ kind }: { kind: PixelMarginDrawingKind }) {
  return <svg className={`pixel-margin-drawing pixel-margin-drawing--${kind}`} data-pixel-kind={kind} viewBox="0 0 64 72" shapeRendering="crispEdges" aria-hidden="true" focusable="false">{drawings[kind]}</svg>;
}
