import type { CSSProperties } from "react";
import type { Locale } from "@/lib/home-store";
import { InkTitleDoodle } from "@/components/ink-title-doodle";
import "@/app/hero-ink-title.css";

const titleLines = {
  zh: ["在莫斯科，", "开启你的", "留学新生活。"],
  ru: ["Свой путь", "в Москве."],
};

function PerchedBird() {
  return <svg className="ink-title-bird" viewBox="0 0 68 64" fill="none" aria-hidden="true" focusable="false">
    <g stroke="var(--spatial-night)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m29 53-1 6-6 1m18-8 1 6 5 1" stroke="var(--spatial-paper)" strokeWidth="2.6" />
      <g className="ink-bird-body">
        <path fill="var(--spatial-paper)" d="M9 36 2 29l15 3c2-10 11-17 22-17 10 0 17 8 17 17 0 13-12 20-24 20-9 0-16-5-18-12L5 43Z" />
        <path fill="var(--spatial-gold)" d="m54 28 10 4-10 4z" />
        <path fill="var(--spatial-lilac)" d="m29 16 4-13 13 13c-7-1-11 0-17 0Z" />
        <path d="m31 10 6-1" />
        <path fill="var(--spatial-teal)" d="M17 34q10-7 22-2c-4 10-15 13-22 2Z" />
        <path d="m23 34 5 2 5-2" strokeWidth="1.3" />
        <ellipse cx="48" cy="26" rx="1.8" ry="2.5" fill="var(--spatial-night)" stroke="none" />
      </g>
    </g>
  </svg>;
}

export function HeroInkTitle({ locale }: { locale: Locale }) {
  const lines = titleLines[locale];
  return <h1 id="hero-title" className="ink-title" data-sky-field=""
    aria-label={lines.join(locale === "ru" ? " " : "")}>
    <svg width="0" height="0" className="ink-title-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="hero-dry-ink" x="-6%" y="-10%" width="112%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="11" result="edge" />
          <feDisplacementMap in="SourceGraphic" in2="edge" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="imprint" />
          <feTurbulence type="fractalNoise" baseFrequency=".05 .62" numOctaves="1" seed="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -15 5.1" />
          <feComposite in="imprint" operator="out" />
        </filter>
      </defs>
    </svg>
    {lines.map((line, row) =>
      <span className="ink-title-line" key={line} aria-hidden="true">
        <span className="ink-title-print">
          {Array.from(line, (letter, column) => <span key={column} className="ink-title-letter"
            style={{ "--stamp-delay": `${row * 100 + column * 24}ms` } as CSSProperties}>{letter}</span>)}
        </span>
        {row === 0 && <>
          <InkTitleDoodle kind="traveler" />
          <PerchedBird />
          <svg className="ink-title-heart" viewBox="0 0 29 29" aria-hidden="true" focusable="false">
            <path d="M5 12q-1-7 5-7 4 0 6 5 5-7 10-2 5 7-11 15Q7 18 5 12Z"
              fill="var(--spatial-pink)" stroke="var(--spatial-paper)" strokeWidth="1.9" strokeLinejoin="round" />
            <path d="m3 20-2 2m6 1-1 3" fill="none" stroke="var(--spatial-lilac)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </>}
        {row === lines.length - 1 && <InkTitleDoodle kind="cat" />}
        {row === lines.length - 1 && <svg className="ink-title-stroke" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M1 8Q61 2 123 3q53-2 110 1l-5 1 11 .6Q155 5 106 7 46 8 3 11l10-2Z" />
          <path fill="currentColor" opacity=".58" d="M87 10q49-5 107-3l-9 1q-51 0-98 2Z" />
        </svg>}
      </span>
    )}
  </h1>;
}
