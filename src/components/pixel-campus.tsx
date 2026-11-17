"use client";

import { useEffect, useRef } from "react";

interface PixelCampusProps {
  variant?: "hero" | "city" | "friends";
  className?: string;
}

function Cloud({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? 0.7 : 1})`}>
    <g className="pixel-campus__moving pixel-campus__cloud">
      <path className="pixel-campus__paper" d="M0 24h16V8h24V0h24v8h16v16h16v16H0Z" />
      <path className="pixel-campus__cloud-shade" d="M0 32h96v8H0Z" />
    </g>
  </g>;
}

function Star({ x, y, pink = false }: { x: number; y: number; pink?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    <path className={`pixel-campus__moving pixel-campus__star ${pink ? "pixel-campus__pink" : "pixel-campus__gold"}`} d="M8 0h8v8h8v8h-8v8H8v-8H0V8h8Z" />
  </g>;
}

function Tree({ x, y, pink = false }: { x: number; y: number; pink?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    <path className="pixel-campus__ground-shadow" d="M0 80h72v8H0Z" />
    <path className="pixel-campus__ink" d="M32 40h8v40h-8Z" />
    <path className={pink ? "pixel-campus__pink" : "pixel-campus__teal-dark"} d="M24 0h24v8h16v16h8v24h-8v8H8v-8H0V24h8V8h16Z" />
    <path className={pink ? "pixel-campus__pink-light" : "pixel-campus__teal"} d="M24 0h24v8h8v16H40v8H8V24h8V8h8Z" />
    <path className="pixel-campus__paper-soft" d="M24 8h16v8H24Z" />
  </g>;
}

function Student({ coat = "gold", darkHair = false }: { coat?: "gold" | "pink" | "lilac"; darkHair?: boolean }) {
  return <>
    <path className="pixel-campus__ground-shadow" d="M0 112h80v8H0Z" />
    <path className="pixel-campus__blue" d="M16 88h48v16H48v16H32V96H16Z" />
    <path className="pixel-campus__ink" d="M8 112h24v8H8Zm40 0h24v8H48Z" />
    <path className="pixel-campus__lilac" d="M56 48h16v8h8v40H64V80h-8Z" />
    <path className="pixel-campus__paper-soft" d="M64 64h8v16h-8Z" />
    <path className={`pixel-campus__${coat}`} d="M24 44h24v8h8v8h8v32H8V64h8V52h8Z" />
    <path className="pixel-campus__skin-shadow" d="M24 40h24v16H24Z" />
    <path className="pixel-campus__skin" d="M8 12h48v32H48v8H24v-8H8Zm-8 56h8v24H0Zm56 12h8v16h-8Z" />
    <path className="pixel-campus__skin-light" d="M8 16h40v16H8Z" />
    <path className={darkHair ? "pixel-campus__ink" : "pixel-campus__hair"} d="M16 0h32v8h16v24h-8V16H40v8H16V16H8v16H0V16h8V8h8Z" />
    <path className="pixel-campus__ink" d="M16 28h4v8h-4Zm24 0h4v8h-4ZM24 40h16v4H24Z" />
    <path className="pixel-campus__pink" d="M8 36h8v4H8Zm36 0h8v4h-8Z" />
    <path className="pixel-campus__paper" d="M16 56h8v32h-8Zm24 0h8v32h-8Z" />
    <path className="pixel-campus__ink" d="M16 76h8v4h-8Zm24 0h8v4h-8Z" />
  </>;
}

function Cat() {
  return <>
    <path className="pixel-campus__ground-shadow" d="M0 56h72v8H0Z" />
    <g className="pixel-campus__moving pixel-campus__tail">
      <path className="pixel-campus__gold" d="M48 40h16V16h8v32H56v8h-8Z" />
    </g>
    <path className="pixel-campus__gold" d="M8 0h8v8h24V0h8v40h8v16H0V40h8Z" />
    <path className="pixel-campus__gold-shade" d="M32 32h16v8h8v16H32Z" />
    <path className="pixel-campus__pink" d="M8 8h8v8H8Zm32 0h8v8h-8Z" />
    <path className="pixel-campus__ink" d="M16 20h4v8h-4Zm20 0h4v8h-4ZM24 32h8v4h-8Z" />
    <path className="pixel-campus__paper" d="M16 48h8v8h-8Zm24 0h8v8h-8Z" />
  </>;
}

function CampusBuilding() {
  return <g transform="translate(172 112)">
    <path className="pixel-campus__blue-shade" d="M-16 136h272v24H-16Z" />
    <path className="pixel-campus__paper" d="M0 24h240v120H0Z" />
    <path className="pixel-campus__pink-light" d="M0 24h24v120H0Zm216 0h24v120h-24Z" />
    <path className="pixel-campus__blue" d="M-8 16h256v16H-8Z" />
    <path className="pixel-campus__gold" d="M80 0h80v8h24v16H56V8h24Z" />
    <path className="pixel-campus__paper" d="M96-24h48V8H96Z" />
    <path className="pixel-campus__blue" d="M104-16h32V8h-32Z" />
    <path className="pixel-campus__gold" d="M116-12h8v12h8v4h-16Z" />
    {[32, 64, 160, 192].map((x) => <g key={x} transform={`translate(${x} 48)`}>
      <path className="pixel-campus__blue" d="M0 0h16v24H0Zm0 40h16v24H0Z" />
      <path className="pixel-campus__teal" d="M0 0h8v16H0Zm0 40h8v16H0Z" />
    </g>)}
    <path className="pixel-campus__lilac" d="M96 40h48v72H96Z" />
    <path className="pixel-campus__paper" d="M112 40h16v56h-16Z" />
    <path className="pixel-campus__ink" d="M104 112h32v32h-32Z" />
    <path className="pixel-campus__gold" d="M120 120h4v8h-4Z" />
    <path className="pixel-campus__lilac-light" d="M80 144h80v8H80Zm-8 8h96v8H72Z" />
    <path className="pixel-campus__blue-shade" d="M-8 144h88v8H-8Zm168 0h80v8h-80Z" />
  </g>;
}

function SceneSky() {
  return <>
    <path className="pixel-campus__sky" d="M72 24h440v16h32v24h24v272h-24v40H56v-24H32V88h16V48h24Z" />
    <path className="pixel-campus__sky-light" d="M72 24h208v16H152v24H80v48H48V48h24Z" />
    <Cloud x={68} y={68} />
    <Cloud x={432} y={64} small />
    <Star x={356} y={48} />
    <Star x={520} y={144} pink />
    <path className="pixel-campus__paper-soft" d="M184 72h8v8h-8Zm304 112h8v8h-8ZM48 184h8v8h-8Z" />
  </>;
}

function HeroScene() {
  return <>
    <SceneSky />
    <path className="pixel-campus__ground-depth" d="M48 264h504v96h-24v32h-40v24H112v-16H72v-32H48Z" />
    <path className="pixel-campus__teal" d="M72 248h456v16h24v80h-24v32h-40v24H112v-16H72v-32H48v-88h24Z" />
    <path className="pixel-campus__teal-light" d="M72 248h456v16H72Zm32 128h384v16H104Z" />
    <path className="pixel-campus__paper" d="M272 256h56v32h56v32h-80v32h-80v48h-64v-64h80v-32h48v-16h-16Z" />
    <path className="pixel-campus__path-shade" d="M272 264h8v24h-8Zm56 32h48v8h-48Zm-96 48h64v8h-64Zm-64 0h8v56h-8Z" />
    <path className="pixel-campus__blue" d="M48 304h64v16h24v40h-16v16H72v-24H48Z" />
    <path className="pixel-campus__paper-soft" d="M64 328h32v8H64Zm24 24h24v8H88Z" />
    <CampusBuilding />
    <Tree x={88} y={168} pink />
    <Tree x={440} y={184} />
    <g transform="translate(344 272)">
      <path className="pixel-campus__ink" d="M0 24h8v40H0Zm64 0h8v40h-8Z" />
      <path className="pixel-campus__gold" d="M-8 0h88v16H-8Zm0 24h88v8H-8Z" />
      <path className="pixel-campus__gold-shade" d="M-8 8h88v8H-8Z" />
    </g>
    <g transform="translate(188 248) scale(1.12)"><Student /></g>
    <g transform="translate(368 208) scale(.72)"><Student coat="pink" darkHair /></g>
    <g transform="translate(456 320) scale(.8)"><Cat /></g>
    <path className="pixel-campus__gold" d="M128 288h8v8h8v8h-8v8h-8v-8h-8v-8h8Zm288 72h8v8h-8Z" />
    <path className="pixel-campus__pink" d="M88 280h8v8h-8Zm344 64h8v8h-8Zm-128 32h8v8h-8Z" />
    <path className="pixel-campus__teal-dark" d="M144 328h8v8h8v-16h8v24h-24Zm280-32h8v8h8v-16h8v24h-24ZM320 376h8v8h8v-16h8v24h-24Z" />
    <Star x={124} y={128} />
  </>;
}

function CityScene() {
  return <>
    <SceneSky />
    <path className="pixel-campus__lilac-light" d="M88 168h64v-40h64v152H88Zm272-40h64V96h56v184H360Z" />
    <path className="pixel-campus__paper" d="M112 184h16v24h-16Zm56-32h16v24h-16Zm0 48h16v24h-16Zm216-48h16v24h-16Zm56-32h16v24h-16Zm0 48h16v24h-16Z" />
    <path className="pixel-campus__ground-depth" d="M48 280h504v72h-24v40H104v-24H72v-16H48Z" />
    <path className="pixel-campus__teal" d="M48 264h504v72H48Zm24 72h456v40H72Z" />
    <path className="pixel-campus__paper" d="M56 312h488v32H56Z" />
    <path className="pixel-campus__blue-shade" d="M80 328h440v8H80Z" />
    <g transform="translate(176 176)">
      <path className="pixel-campus__ink" d="M48 128h24v24H48Zm120 0h24v24h-24ZM88-32h64v8h-24v24h-8v-24H88Z" />
      <path className="pixel-campus__gold" d="M24 0h168v8h24v16h8v104H8V24h8V8h8Z" />
      <path className="pixel-campus__gold-shade" d="M8 96h216v32H8Z" />
      <path className="pixel-campus__blue" d="M24 24h48v48H24Zm64 0h48v48H88Zm64 0h48v88h-48Z" />
      <path className="pixel-campus__teal" d="M32 24h32v32H32Zm64 0h32v32H96Zm64 0h32v64h-32Z" />
      <path className="pixel-campus__paper" d="M32 24h16v8H32Zm64 0h16v8H96Zm64 0h16v8h-16ZM24 88h16v8H24Zm168 24h16v8h-16Z" />
      <path className="pixel-campus__ink" d="M152 88h48v8h-48Z" />
    </g>
    <Tree x={88} y={232} pink />
    <g transform="translate(432 256) scale(.88)"><Student coat="lilac" /></g>
    <path className="pixel-campus__ink" d="M384 104h8v64h-8Z" />
    <path className="pixel-campus__pink" d="M360 96h56v40h-56Z" />
    <path className="pixel-campus__paper" d="M376 104h8v8h16v8h-16v8h-8Z" />
    <Star x={272} y={112} />
    <path className="pixel-campus__pink" d="M152 360h8v8h-8Zm240 0h8v8h-8Z" />
  </>;
}

function FriendsScene() {
  return <>
    <SceneSky />
    <path className="pixel-campus__ground-depth" d="M48 280h504v64h-24v32h-40v24H112v-16H72v-40H48Z" />
    <path className="pixel-campus__teal" d="M48 264h504v64h-24v32h-40v24H112v-16H72v-40H48Z" />
    <path className="pixel-campus__paper" d="M192 320h216v16h24v32H176v-32h16Z" />
    <Tree x={64} y={184} />
    <Tree x={464} y={176} pink />
    <g transform="translate(204 136)">
      <path className="pixel-campus__ink" d="M0 0h8v152H0Zm176 0h8v152h-8Z" />
      <path className="pixel-campus__gold" d="M-16 0h216v16H-16Z" />
      <path className="pixel-campus__pink-light" d="M8 16h168v80H8Z" />
      <path className="pixel-campus__paper" d="M24 32h48v48H24Zm64 0h72v48H88Z" />
      <path className="pixel-campus__lilac" d="M32 40h32v8H32Zm0 16h24v8H32Zm64-16h24v24H96Z" />
      <path className="pixel-campus__teal" d="M128 40h24v8h-24Zm0 16h24v8h-24Z" />
    </g>
    <g transform="translate(136 228)"><Student coat="pink" /></g>
    <g transform="translate(348 224)"><Student coat="gold" darkHair /></g>
    <g transform="translate(264 292) scale(.85)"><Cat /></g>
    <path className="pixel-campus__blue" d="M224 344h48v16h-48Z" />
    <path className="pixel-campus__paper" d="M232 344h40v8h-40Z" />
    <path className="pixel-campus__pink" d="M320 328h32v24h-32Z" />
    <path className="pixel-campus__paper" d="M328 328h16v16h-16Z" />
    <Star x={148} y={152} />
    <Star x={424} y={168} pink />
    <path className="pixel-campus__teal-dark" d="M104 336h8v8h8v-16h8v24h-24Zm352-8h8v8h8v-16h8v24h-24Z" />
  </>;
}

/** Decorative campus scenes; motion stays local and never carries page content. */
export function PixelCampus({ variant = "hero", className = "" }: PixelCampusProps) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const updatePlayback = () => {
      scene.dataset.motion = inView && document.visibilityState === "visible" && !preference.matches ? "running" : "paused";
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updatePlayback();
    });
    observer?.observe(scene);
    preference.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      observer?.disconnect();
      scene.dataset.motion = "paused";
      preference.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, []);

  return <div ref={sceneRef} className={`pixel-campus pixel-campus--${variant} ${className}`} data-motion="paused" aria-hidden="true">
    <svg viewBox="0 0 600 448" fill="none" shapeRendering="crispEdges" focusable="false" aria-hidden="true">
      {variant === "city" ? <CityScene /> : variant === "friends" ? <FriendsScene /> : <HeroScene />}
    </svg>
  </div>;
}
