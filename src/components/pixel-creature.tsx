import type { ReactNode } from "react";
import "@/app/pixel-creature.css";

export type PixelCreatureKind = "fox" | "cat" | "frog" | "bee" | "axolotl";

/* The ledge is at y=64; heads stay above it and paws curl across its front. */
const creatures: Record<PixelCreatureKind, ReactNode> = {
  fox: <>
    <g className="pixel-creature__tail">
      <path className="pixel-creature__outline" d="M58 60h10V48h8V36h16v28h-8v8H58z" />
      <path className="pixel-creature__coat" d="M62 60h10V48h8v-8h8v20h-8v8H62z" />
      <path className="pixel-creature__cream" d="M80 40h8v12H76v-4h4z" />
    </g>
    <path className="pixel-creature__shade" d="M30 46h32v18H26V52h4z" />
    <g className="pixel-creature__head">
      <path className="pixel-creature__outline" d="M18 8h12v8h8v4h16v-4h8V8h12v40h-8v8H54v8H38v-8H26v-8h-8z" />
      <path className="pixel-creature__coat" d="M22 12h4v8h8v4h24v-4h8v-8h4v32h-8v8H54v8H38v-8H30v-8h-8z" />
      <path className="pixel-creature__shade" d="M22 16h4v12h8v4H22zm44 0h4v16H58v-4h8z" />
      <path className="pixel-creature__cream" d="M22 36h8v8h12v4h8v-4h12v-8h8v8h-8v8H54v8H38v-8H30v-8h-8z" />
      <g className="pixel-creature__eyes"><path className="pixel-creature__ink" d="M32 32h4v8h-4zm24 0h4v8h-4z" /><path className="pixel-creature__glint" d="M32 32h2v2h-2zm24 0h2v2h-2z" /></g>
      <path className="pixel-creature__ink" d="M42 44h8v4h-8zm2 4h4v8h-4z" />
      <path className="pixel-creature__highlight" d="M38 24h16v4H38z" />
    </g>
    <g className="pixel-creature__paws"><path className="pixel-creature__outline" d="M24 60h16v14H24zm30 0h16v14H54z" /><path className="pixel-creature__coat" d="M28 60h8v10h-8zm30 0h8v10h-8z" /><path className="pixel-creature__cream" d="M28 66h8v4h-8zm30 0h8v4h-8z" /></g>
  </>,
  cat: <>
    <g className="pixel-creature__tail">
      <path className="pixel-creature__outline" d="M64 58h12V30h8v-8h8v20h-4v24H76v6H64z" />
      <path className="pixel-creature__coat" d="M68 62h12V34h8v4h-4v24h-8v6h-8z" />
      <path className="pixel-creature__shade" d="M80 46h4v6h-4zm0-12h8v4h-8z" />
    </g>
    <path className="pixel-creature__shade" d="M24 48h40v16H24z" />
    <g className="pixel-creature__head">
      <path className="pixel-creature__outline" d="M14 10h8v4h8v8h28v-8h8v-4h8v44h-8v6H22v-6h-8z" />
      <path className="pixel-creature__coat" d="M18 14h4v4h8v8h28v-8h8v-4h4v36h-8v6H26v-6h-8z" />
      <path className="pixel-creature__pink" d="M22 22h4v8h-8v-8zm40 0h4v8h-8v-4h4z" />
      <path className="pixel-creature__shade" d="M34 26h4v8h-4zm8 0h4v12h-4zm8 0h4v8h-4z" />
      <g className="pixel-creature__eyes"><path className="pixel-creature__ink" d="M26 38h6v6h-6zm30 0h6v6h-6z" /><path className="pixel-creature__glint" d="M26 38h2v2h-2zm30 0h2v2h-2z" /></g>
      <path className="pixel-creature__cream" d="M34 46h20v8H34z" /><path className="pixel-creature__pink" d="M40 44h8v4h-8z" />
      <path className="pixel-creature__ink" d="M42 48h4v4h-4zm-28-8h8v2h-8zm52 0h10v2H66zm-56 8h12v2H10zm56 0h14v2H66z" />
    </g>
    <g className="pixel-creature__paws"><path className="pixel-creature__outline" d="M22 60h16v14H22zm32 0h16v14H54z" /><path className="pixel-creature__cream" d="M26 60h8v10h-8zm32 0h8v10h-8z" /><path className="pixel-creature__shade" d="M28 66h2v4h-2zm32 0h2v4h-2z" /></g>
  </>,
  frog: <>
    <path className="pixel-creature__outline" d="M20 48h56v8h8v14H64v-6H32v6H12V56h8z" />
    <path className="pixel-creature__shade" d="M24 50h48v10h8v6H68v-6H28v6H16v-6h8z" />
    <g className="pixel-creature__head">
      <path className="pixel-creature__outline" d="M20 18h20v8h16v-8h20v8h8v28h-8v8H20v-8h-8V26h8z" />
      <path className="pixel-creature__coat" d="M24 22h12v8h24v-8h12v8h8v20h-8v8H24v-8h-8V30h8z" />
      <path className="pixel-creature__highlight" d="M36 34h28v4H36z" />
      <path className="pixel-creature__cream" d="M20 26h16v12H20zm40 0h16v12H60z" />
      <g className="pixel-creature__eyes"><path className="pixel-creature__ink" d="M26 28h6v8h-6zm38 0h6v8h-6z" /><path className="pixel-creature__glint" d="M26 28h2v2h-2zm38 0h2v2h-2z" /></g>
      <path className="pixel-creature__cream" d="M28 48h40v8H28z" />
      <path className="pixel-creature__ink" d="M28 44h4v4h32v-4h4v8H28z" />
      <path className="pixel-creature__pink" d="M20 42h8v4h-8zm48 0h8v4h-8z" />
    </g>
    <g className="pixel-creature__paws"><path className="pixel-creature__outline" d="M24 60h16v12H20v-8h4zm32 0h16v4h4v8H56z" /><path className="pixel-creature__coat" d="M28 60h8v8H24v-4h4zm32 0h8v4h4v4H60z" /></g>
  </>,
  bee: <>
    <g className="pixel-creature__wing pixel-creature__wing--left"><path className="pixel-creature__outline" d="M16 18h16v6h8v24H24v-8h-8z" /><path className="pixel-creature__wing-fill" d="M20 22h8v6h8v16h-8v-8h-8z" /><path className="pixel-creature__glint" d="M24 26h4v8h-4z" /></g>
    <g className="pixel-creature__wing pixel-creature__wing--right"><path className="pixel-creature__outline" d="M64 14h16v18h-8v8H56V22h8z" /><path className="pixel-creature__wing-fill" d="M68 18h8v10h-8v8h-8V26h8z" /><path className="pixel-creature__glint" d="M68 20h4v8h-4z" /></g>
    <g className="pixel-creature__head">
      <path className="pixel-creature__outline" d="M18 38h8v-8h46v8h8v24h-8v6H26v-6h-8z" />
      <path className="pixel-creature__coat" d="M26 38h4v-4h38v4h8v20h-8v6H30v-6h-8V42h4z" />
      <path className="pixel-creature__shade" d="M48 34h8v30h-8zm16 0h4v4h4v20h-8z" />
      <path className="pixel-creature__highlight" d="M30 34h14v6H30z" />
      <path className="pixel-creature__outline" d="M28 34V22h-4v-8h8v16h4v4zm12 0V22h4v-8h8v8h-8v12z" />
      <g className="pixel-creature__eyes"><path className="pixel-creature__ink" d="M26 44h4v8h-4zm14 0h4v8h-4z" /><path className="pixel-creature__glint" d="M26 44h2v2h-2zm14 0h2v2h-2z" /></g>
      <path className="pixel-creature__pink" d="M24 54h6v4h-6zm16 0h6v4h-6z" />
      <path className="pixel-creature__ink" d="M32 54h6v4h-6z" />
    </g>
    <g className="pixel-creature__paws"><path className="pixel-creature__ink" d="M30 62h4v10h-8v-4h4zm26 0h4v10h-8v-4h4z" /></g>
  </>,
  axolotl: <>
    <g className="pixel-creature__tail"><path className="pixel-creature__shade" d="M56 54h12v-4h12v4h8v8h-8v8H56z" /><path className="pixel-creature__highlight" d="M68 54h12v4h4v4H68z" /></g>
    <g className="pixel-creature__head">
      <g className="pixel-creature__gill pixel-creature__gill--left"><path className="pixel-creature__gill-fill" d="M20 30H8V18h8v8h8v10H12v8h12v8H8v-8H4V32h16zm-4 22h8v8H8v-8z" /></g>
      <g className="pixel-creature__gill pixel-creature__gill--right"><path className="pixel-creature__gill-fill" d="M72 30h12V18h-8v8h-8v10h12v8H68v8h16v-8h4V32H72zm4 22h-8v8h16v-8z" /></g>
      <path className="pixel-creature__outline" d="M24 24h44v6h8v26h-8v6H24v-6h-8V30h8z" />
      <path className="pixel-creature__coat" d="M28 28h36v6h8v18h-8v6H28v-6h-8V34h8z" />
      <path className="pixel-creature__highlight" d="M32 28h28v6H32z" />
      <g className="pixel-creature__eyes"><path className="pixel-creature__ink" d="M28 38h4v8h-4zm32 0h4v8h-4z" /><path className="pixel-creature__glint" d="M28 38h2v2h-2zm32 0h2v2h-2z" /></g>
      <path className="pixel-creature__gill-fill" d="M24 46h10v4H24zm34 0h10v4H58z" /><path className="pixel-creature__ink" d="M40 48h4v4h8v-4h4v8H40z" />
    </g>
    <g className="pixel-creature__paws"><path className="pixel-creature__outline" d="M24 60h16v14H24zm30 0h16v14H54z" /><path className="pixel-creature__coat" d="M28 60h8v10h-8zm30 0h8v10h-8z" /><path className="pixel-creature__gill-fill" d="M28 68h8v2h-8zm30 0h8v2h-8z" /></g>
  </>,
};

/** Pure artwork: animation is opt-in through the containing scene's CSS. */
export function PixelCreature({ kind, animated = false }: { kind: PixelCreatureKind; animated?: boolean }) {
  return <svg className={`pixel-creature pixel-creature--${kind}`} data-animated={animated} viewBox="0 0 96 80" width="96" height="80" shapeRendering="crispEdges" aria-hidden="true" focusable="false">{creatures[kind]}</svg>;
}
