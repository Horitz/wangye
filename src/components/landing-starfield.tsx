"use client";

import { useEffect, type CSSProperties, type RefObject } from "react";
import "@/app/landing-starfield.css";

type Chart = {
  stars: [number, number][];
  lines: number[][];
  bright: number;
  viewBox: string;
};

const charts = {
  dipper: {
    stars: [[9,18], [43,23], [69,45], [106,59], [152,54], [142,83], [111,86]],
    lines: [[0,1,2,3,4,5,6,3]], bright: 3, viewBox: "0 0 162 98",
  },
  cassiopeia: {
    stars: [[8,13], [35,48], [64,17], [101,37], [125,7]],
    lines: [[0,1,2,3,4]], bright: 1, viewBox: "0 0 134 57",
  },
  orion: {
    stars: [[18,17], [63,8], [39,48], [47,44], [55,40], [73,84], [17,96]],
    lines: [[0,2,3,4,1], [2,6], [4,5]], bright: 0, viewBox: "0 0 88 104",
  },
  cygnus: {
    stars: [[34,8], [51,43], [96,54], [15,68], [60,67], [70,93]],
    lines: [[0,1,4,5], [3,1,2]], bright: 0, viewBox: "0 0 104 101",
  },
  lyra: {
    stars: [[12,10], [43,29], [64,19], [89,51], [66,66]],
    lines: [[0,1,2,3,4,1]], bright: 0, viewBox: "0 0 98 75",
  },
} satisfies Record<string, Chart>;

export function Constellation({ name }: { name: keyof typeof charts }) {
  const { stars, lines, bright, viewBox } = charts[name];
  const [x, y] = stars[bright];
  return <svg className={`sky-constellation sky-constellation--${name}`} data-sky-field=""
    viewBox={viewBox} fill="none" focusable="false" aria-hidden="true">
    {lines.map((line, i) => <polyline key={i} points={line.map(index => stars[index].join(",")).join(" ")}
      stroke="currentColor" strokeOpacity=".38" strokeWidth=".9" strokeLinejoin="round" />)}
    {stars.map(([cx, cy], i) => <g key={i} className="constellation-light"
      style={{ "--twinkle-delay": `-${(i * 3.7 + bright * 1.3).toFixed(1)}s`, "--twinkle-time": `${6 + i % 4}s` } as CSSProperties}>
      <circle cx={cx} cy={cy} r={i === bright ? 2.5 : 1.65} fill="currentColor" />
      {i === bright && <circle cx={x} cy={y} r="5" stroke="currentColor" strokeOpacity=".27" strokeWidth=".8" />}
    </g>)}
  </svg>;
}

export function useSkyPlayback(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === "undefined") return;
    const fields = root.current.querySelectorAll<HTMLElement | SVGElement>("[data-sky-field]");
    const visible = new Set<Element>();
    const sync = () => fields.forEach(field => {
      field.dataset.playing = String(visible.has(field) && !document.hidden);
    });
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      sync();
    });
    fields.forEach(field => observer.observe(field));
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [root]);
}

/** A local interpretation of the drifting night sky at github.com/YaoqxCN/star-sky. */
export function HeroStarfield() {
  return <div className="hero-starfield" data-sky-field="" aria-hidden="true">
    <div className="hero-starfield-veil">
      <i className="starfield-depth starfield-depth--far" />
      <i className="starfield-depth starfield-depth--near" />
    </div>
    <Constellation name="dipper" />
    <Constellation name="cassiopeia" />
  </div>;
}
