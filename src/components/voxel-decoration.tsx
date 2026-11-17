import type { ReactNode } from "react";
import "../app/voxel-decoration.css";

export type VoxelDecorationKind = "grass" | "crystal" | "books" | "lantern" | "mushroom" | "chest" | "pickaxe";

const decorations: Record<VoxelDecorationKind, ReactNode> = {
  mushroom: <>
    <path className="voxel-decoration__shadow" d="m12 96 36-18 36 18-36 16z" />
    <g className="voxel-material--grass">
      <path className="voxel-face--top" d="m12 86 36-18 36 18-36 18z" />
      <path className="voxel-face--side" d="m48 104 36-18v6l-36 18z" />
      <path className="voxel-face--front" d="m12 86 36 18v6L12 92z" />
    </g>
    <path className="voxel-decoration__paper" d="M40 48h16v40H40zM36 88h24v8H36z" />
    <g className="voxel-material--rose">
      <path className="voxel-face--side" d="M20 44h56v16H20zM32 60h32v8H32z" />
      <path className="voxel-face--front" d="M32 20h32v8h12v12h8v12H12V40h8V28h12z" />
      <path className="voxel-face--top" d="M32 20h32v8H32zM20 28h12v8H20z" />
    </g>
    <path className="voxel-decoration__paper" d="M36 28h12v8H36zM60 36h12v8H60zM20 40h12v8H20z" />
    <path className="voxel-decoration__gold" d="M64 76h4v-4h4v4h4v4h-4v4h-4v-4h-4z" />
  </>,
  chest: <>
    <path className="voxel-decoration__shadow" d="m8 94 40-20 40 20-40 18z" />
    <g className="voxel-material--wood">
      <path className="voxel-face--top" d="m12 38 36-18 36 18-36 18z" />
      <path className="voxel-face--front" d="m12 38 36 18v44L12 82z" />
      <path className="voxel-face--side" d="m48 56 36-18v44l-36 18z" />
      <path className="voxel-texture--light" d="m20 38 28-14 8 4-28 14zm0 18 20 10v4L20 60zm0 14 20 10v4L20 74z" />
      <path className="voxel-texture--dark" d="m12 54 36 18v4L12 58zm36 18 36-18v4L48 76z" />
    </g>
    <g className="voxel-material--stone">
      <path className="voxel-face--front" d="m12 38 4 2v42l-4-2zm32 16 4 2v44l-4-2z" />
      <path className="voxel-face--side" d="m80 40 4-2v44l-4 2z" />
    </g>
    <path className="voxel-decoration__gold" d="m26 60 12 6v16l-12-6z" />
    <path className="voxel-decoration__paper" d="m30 66 4 2v6l-4-2z" />
    <path className="voxel-decoration__sparkle" d="M72 8h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
  </>,
  pickaxe: <>
    <path className="voxel-decoration__shadow" d="m12 98 36-18 36 18-36 14z" />
    <g className="voxel-material--wood">
      <path className="voxel-face--side" d="m20 94-8-8 44-44 8 8z" />
      <path className="voxel-face--front" d="m12 82 44-44 8 8-44 44z" />
      <path className="voxel-texture--light" d="m20 76 28-28 4 4-28 28z" />
    </g>
    <g className="voxel-material--grass">
      <path className="voxel-face--side" d="M36 20h28v8h8v8h8v28h-8V44h-8V36h-8v-8H36z" />
      <path className="voxel-face--front" d="M28 16h28v8h8v8h8v28h-8V40h-8v-8h-8v-8H28z" />
      <path className="voxel-texture--light" d="M28 16h28v4H28zM56 24h8v4h-8zM64 32h4v20h-4z" />
    </g>
    <path className="voxel-decoration__sparkle" d="M16 36h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
    <path className="voxel-decoration__gold" d="M68 84h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
  </>,
  grass: <>
    <path className="voxel-decoration__shadow" d="m12 96 36-18 36 18-36 16z" />
    <g className="voxel-material--soil">
      <path className="voxel-face--front" d="m12 54 36 18v32L12 86z" />
      <path className="voxel-face--side" d="m48 72 36-18v32l-36 18z" />
      <path className="voxel-texture--light" d="m20 72 8 4v6l-8-4zm16 16 8 4v4l-8-4z" />
      <path className="voxel-texture--dark" d="m16 80 8 4v4l-8-4zm20-2 8 4v4l-8-4zm20 6 8-4v6l-8 4zm16-10 8-4v4l-8 4z" />
    </g>
    <g className="voxel-material--grass">
      <path className="voxel-face--top" d="m12 54 36-18 36 18-36 18z" />
      <path className="voxel-face--front" d="m12 54 36 18v10l-8-4v-4l-8-4v4l-8-4v-4l-12-6z" />
      <path className="voxel-face--side" d="m48 72 36-18v10l-8 4v-4l-8 4v8l-8 4v-4l-12 6z" />
      <path className="voxel-texture--light" d="m24 52 8-4 8 4-8 4zm28-8 8 4-8 4-8-4z" />
      <path className="voxel-texture--dark" d="m44 60 8-4 8 4-8 4zm20-8 4-2 8 4-4 2z" />
      <g className="voxel-decoration__sprout">
        <path className="voxel-face--side" d="M44 44V28h4v-8h4v24z" />
        <path className="voxel-face--front" d="M44 36h-8v-4h-4v-8h4v4h8zm8-8h4v-8h8v4h-4v8h-8z" />
        <path className="voxel-texture--light" d="M36 28h4v4h-4zm20-8h4v4h-4z" />
      </g>
    </g>
    <path className="voxel-decoration__gold" d="M68 36h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
    <path className="voxel-decoration__paper" d="M68 40h4v4h-4z" />
  </>,
  crystal: <>
    <path className="voxel-decoration__shadow" d="m8 94 40-20 40 20-40 18z" />
    <g className="voxel-material--stone">
      <path className="voxel-face--top" d="m12 86 36-18 36 18-36 18z" />
      <path className="voxel-face--front" d="m12 86 36 18v6L12 92z" />
      <path className="voxel-face--side" d="m48 104 36-18v6l-36 18z" />
      <path className="voxel-texture--light" d="m20 86 8-4 8 4-8 4zm40 2 8-4 8 4-8 4z" />
    </g>
    <g className="voxel-material--rose">
      <path className="voxel-face--front" d="M20 62v16l16 10V60l-8-12v8h-4v6z" />
      <path className="voxel-face--side" d="m36 60 8 12v10l-8 6z" />
      <path className="voxel-texture--light" d="M28 62h4v14h-4z" />
    </g>
    <g className="voxel-material--crystal">
      <path className="voxel-face--top" d="M44 20h8v8h4v8h4v12L48 58 36 48V36h4v-8h4z" />
      <path className="voxel-face--front" d="m36 48 12 10v32l-12-8z" />
      <path className="voxel-face--side" d="m48 58 12-10v34l-12 8z" />
      <path className="voxel-texture--light" d="M44 32h4v12h-4zm-4 22 4 2v20l-4-2z" />
    </g>
    <g className="voxel-material--grass">
      <path className="voxel-face--top" d="M68 42h4v8h4v8l-8 8-8-4v-8h4v-8h4z" />
      <path className="voxel-face--front" d="m60 62 8 4v24l-8-6z" />
      <path className="voxel-face--side" d="m68 66 8-8v24l-8 8z" />
    </g>
    <path className="voxel-decoration__sparkle" d="M16 24h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
    <path className="voxel-decoration__sparkle voxel-decoration__sparkle--late" d="M76 16h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
  </>,
  books: <>
    <path className="voxel-decoration__shadow" d="m8 96 44-22 36 18-44 20z" />
    <g className="voxel-material--grass">
      <path className="voxel-face--top" d="m12 78 40-20 32 16-40 20z" />
      <path className="voxel-face--front" d="m12 78 32 16v12L12 90z" />
      <path className="voxel-face--side" d="m44 94 40-20v12l-40 20z" />
      <path className="voxel-decoration__paper" d="m48 94 32-16v6l-32 16z" />
      <path className="voxel-texture--dark" d="m16 82 4 2v8l-4-2zm32 14 32-16v2l-32 16z" />
    </g>
    <g className="voxel-material--rose">
      <path className="voxel-face--top" d="m20 62 36-18 28 14-36 18z" />
      <path className="voxel-face--front" d="m20 62 28 14v12L20 74z" />
      <path className="voxel-face--side" d="m48 76 36-18v12L48 88z" />
      <path className="voxel-decoration__paper" d="m52 76 28-14v6L52 82z" />
      <path className="voxel-texture--dark" d="m24 66 4 2v8l-4-2zm28 12 28-14v2L52 80z" />
    </g>
    <g className="voxel-material--crystal">
      <path className="voxel-face--top" d="m12 44 36-18 32 16-36 18z" />
      <path className="voxel-face--front" d="m12 44 32 16v14L12 58z" />
      <path className="voxel-face--side" d="m44 60 36-18v14L44 74z" />
      <path className="voxel-decoration__paper" d="m48 60 28-14v8L48 68z" />
      <path className="voxel-texture--dark" d="m16 48 4 2v10l-4-2zm32 16 28-14v2L48 66z" />
      <path className="voxel-texture--light" d="m24 42 24-12 4 2-24 12z" />
    </g>
    <path className="voxel-decoration__gold" d="m40 42 12-6 12 6-12 6zm20 10 8-4v22l-4-2-4 6z" />
    <path className="voxel-decoration__sparkle" d="M20 12h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
    <path className="voxel-decoration__sparkle voxel-decoration__sparkle--late" d="M80 26h4v4h-4z" />
  </>,
  lantern: <>
    <path className="voxel-decoration__shadow" d="m12 98 36-18 36 18-36 14z" />
    <g className="voxel-material--stone">
      <path className="voxel-face--side" d="M36 28V12h8V8h12v4h8v16h-8V16H44v12z" />
      <path className="voxel-face--top" d="M40 12h4v12h-4zm4-4h12v4H44z" />
    </g>
    <g className="voxel-material--crystal">
      <path className="voxel-face--top" d="m24 34 24-12 24 12 8 14-32 16-32-16z" />
      <path className="voxel-face--front" d="m16 48 32 16v6L16 54z" />
      <path className="voxel-face--side" d="m48 64 32-16v6L48 70z" />
    </g>
    <g className="voxel-material--light">
      <path className="voxel-face--front" d="m24 58 24 12v26L24 84z" />
      <path className="voxel-face--side" d="m48 70 24-12v26L48 96z" />
      <path className="voxel-decoration__wick" d="M36 70h4v4h4v14l-12-6V70h4zm20 6 8-4v10l-8 4z" />
    </g>
    <g className="voxel-material--crystal">
      <path className="voxel-face--front" d="m20 56 4 2v28l-4-2zm24 12 4 2v28l-4-2z" />
      <path className="voxel-face--side" d="m72 58 4-2v28l-4 2z" />
      <path className="voxel-face--top" d="m20 84 28 14 28-14 8 8-36 18-36-18z" />
      <path className="voxel-face--front" d="m12 92 36 18v2L12 96z" />
      <path className="voxel-face--side" d="m48 110 36-18v4l-36 16z" />
    </g>
    <path className="voxel-decoration__sparkle" d="M8 64h4v4h4v4h-4v4H8v-4H4v-4h4z" />
    <path className="voxel-decoration__sparkle voxel-decoration__sparkle--late" d="M80 28h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
  </>,
};

/** Original voxel keepsakes; the surrounding ambience owns placement and motion. */
export function VoxelDecoration({ kind }: { kind: VoxelDecorationKind }) {
  return (
    <svg
      className={`voxel-decoration voxel-decoration--${kind}`}
      data-voxel-kind={kind}
      viewBox="0 0 96 112"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {decorations[kind]}
    </svg>
  );
}
