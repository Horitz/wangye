import type { CSSProperties } from "react";
import { NightSkyPlanet } from "@/components/night-sky-planet";
import "@/app/landing-night-sky.css";

type Star = { x: number; y: number; size: number; tier: 0 | 1 | 2; tone?: "gold" | "lilac" | "teal" };

// Fixed, uneven constellations stay stable through language and viewport changes.
const stars: Record<"left" | "right", Star[]> = {
  left: [
    { x: 19, y: 2, size: 3, tier: 2 },
    { x: 73, y: 5, size: 7, tier: 1, tone: "lilac" },
    { x: 35, y: 10, size: 3, tier: 0 },
    { x: 82, y: 16, size: 2, tier: 2 },
    { x: 61, y: 24, size: 4, tier: 1, tone: "gold" },
    { x: 22, y: 32, size: 9, tier: 2, tone: "lilac" },
    { x: 78, y: 39, size: 3, tier: 1 },
    { x: 43, y: 47, size: 3, tier: 0, tone: "teal" },
    { x: 13, y: 55, size: 2, tier: 2 },
    { x: 81, y: 63, size: 8, tier: 1, tone: "gold" },
    { x: 57, y: 71, size: 3, tier: 2 },
    { x: 26, y: 80, size: 4, tier: 1 },
    { x: 68, y: 88, size: 3, tier: 0, tone: "lilac" },
    { x: 40, y: 96, size: 7, tier: 2, tone: "teal" },
  ],
  right: [
    { x: 23, y: 3, size: 3, tier: 2, tone: "teal" },
    { x: 44, y: 9, size: 2, tier: 1 },
    { x: 81, y: 14, size: 8, tier: 1, tone: "gold" },
    { x: 32, y: 20, size: 3, tier: 0 },
    { x: 72, y: 27, size: 3, tier: 2 },
    { x: 17, y: 35, size: 8, tier: 1, tone: "lilac" },
    { x: 59, y: 43, size: 2, tier: 2 },
    { x: 79, y: 50, size: 3, tier: 0, tone: "gold" },
    { x: 36, y: 58, size: 4, tier: 1 },
    { x: 84, y: 66, size: 9, tier: 2, tone: "teal" },
    { x: 18, y: 74, size: 2, tier: 2 },
    { x: 62, y: 82, size: 3, tier: 1 },
    { x: 29, y: 90, size: 3, tier: 0, tone: "lilac" },
    { x: 75, y: 97, size: 7, tier: 2, tone: "gold" },
  ],
};

/** A quiet sky in the real page margins, sharing PageAmbience's playback observer. */
export function LandingNightSky() {
  return <div className="landing-night-sky" aria-hidden="true">
    {(["left", "right"] as const).map(side => <div key={side} className={`landing-sky-rail landing-sky-rail--${side}`}>
      {stars[side].map((star, index) => <span
        key={index}
        className="ambience-drawing landing-sky-mark"
        data-motion="paused"
        data-tier={star.tier}
        data-tone={star.tone ?? "paper"}
        style={{ "--sky-x": `${star.x}%`, "--sky-y": `${star.y}%`, "--sky-star-size": `${star.size}px`, "--sky-star-delay": `${-(index * .9 + (side === "right" ? 2.3 : 0))}s`, "--sky-star-duration": `${6.8 + index % 3 * 1.4}s` } as CSSProperties}
      ><span className={star.size > 4 ? "landing-sky-star landing-sky-star--spark" : "landing-sky-star"} /></span>)}
      {side === "right" && <>
        <span className="landing-sky-planet landing-sky-planet--ringed"><NightSkyPlanet kind="ringed" /></span>
        <span className="landing-sky-planet landing-sky-planet--striped"><NightSkyPlanet kind="striped" /></span>
      </>}
    </div>)}
  </div>;
}
