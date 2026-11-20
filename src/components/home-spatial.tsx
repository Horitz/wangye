"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight, BookOpen, MapPin, Plane, Sparkles } from "lucide-react";
import { ClayStudent } from "@/components/clay-student";
import { PerspectiveTunnel } from "@/components/ui/perspective-tunnel";
import { HeroInkTitle } from "@/components/hero-ink-title";
import { InkTitleDoodle } from "@/components/ink-title-doodle";
import { UniversityMarquee } from "@/components/university-marquee";
import { Constellation, HeroStarfield } from "@/components/landing-starfield";
import { useOrbitalMotion } from "@/lib/use-orbital-motion";
import { getHomeRevealState } from "@/lib/home-reveal-state";
import type { Locale } from "@/lib/home-store";

const chapters = [
  {
    id: "chapter-arrival",
    constellation: "orion",
    doodle: "plane",
    title: { zh: "在新城市落脚。", ru: "Первые дни в новом городе." },
    description: {
      zh: "从一张机票开始，认识新的校园、街道和日常。你的留学生活，就从这里展开。",
      ru: "Один билет — и впереди новый кампус, улицы и привычки. Здесь начинается ваша студенческая жизнь.",
    },
  },
  {
    id: "chapter-settle",
    constellation: "cygnus",
    doodle: "lookout",
    title: { zh: "把陌生，变成熟悉。", ru: "Новый город становится своим." },
    description: {
      zh: "慢慢认识这座城市，也慢慢建立属于自己的生活节奏。",
      ru: "Знакомьтесь с городом и постепенно находите свой ритм жизни.",
    },
  },
  {
    id: "chapter-continue",
    constellation: "lyra",
    doodle: "mushrooms",
    title: { zh: "留学生活，不止一种可能。", ru: "Больше, чем учёба." },
    description: {
      zh: "学习、探索、遇见不同的人。按自己的节奏，走出属于你的留学故事。",
      ru: "Учитесь, исследуйте, знакомьтесь. Создавайте свою историю в собственном темпе.",
    },
  },
] as const;

function JourneyScene() {
  const scene = useRef<HTMLDivElement>(null);
  useOrbitalMotion(scene);
  return (
    <div className="people-scene" ref={scene} aria-hidden="true">
      <div className="people-orbit-line" />
      <div className="people-portrait portrait-main"><div className="main-disc" /><div className="main-figure"><ClayStudent /></div></div>
      <div className="people-portrait portrait-friend friend-glasses" data-orbit-kind="person" data-orbit-phase="220"><ClayStudent variant="glasses" /></div>
      <div className="people-portrait portrait-friend friend-longhair" data-orbit-kind="person" data-orbit-phase="340"><ClayStudent variant="longhair" /></div>
      <div className="people-portrait portrait-friend friend-beanie" data-orbit-kind="person" data-orbit-phase="100"><ClayStudent variant="beanie" /></div>
      <div className="orbit-object orbit-book" data-orbit-phase="280"><BookOpen /></div>
      <div className="orbit-object orbit-pin" data-orbit-phase="40"><MapPin /></div>
      <div className="orbit-object orbit-plane-icon" data-orbit-phase="160"><Plane /></div>
      <span className="people-spark people-spark-one"><Sparkles /></span>
      <span className="people-spark people-spark-two">✦</span>
    </div>
  );
}


export function SpatialHome({ locale, onStart }: {
  locale: Locale;
  onStart: () => void;
}) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const readingProgress = useRef<HTMLSpanElement>(null);
  const hero = useRef<HTMLElement>(null);
  const story = useRef<HTMLElement>(null);

  useEffect(() => {
    const page = hero.current?.closest<HTMLElement>(".spatial-page");
    const scenes = Array.from(story.current?.querySelectorAll<HTMLElement>(".journey-chapter") ?? []);
    const curtain = page?.querySelector<HTMLElement>(".home-curtain");
    const copies = Array.from(page?.querySelectorAll<HTMLElement>("[data-copy-anchor] > [data-reveal]") ?? []);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const clamp = (fraction: number) => Math.max(0, Math.min(1, fraction));

    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const viewport = root.clientHeight;
      const pageLength = Math.max(1, root.scrollHeight - viewport);
      const positions = scenes.map(scene => scene.getBoundingClientRect());
      const copyBounds = copies.map(copy => copy.parentElement!.getBoundingClientRect());
      const finaleBounds = curtain?.getBoundingClientRect();
      const heroBounds = hero.current?.getBoundingClientRect();
      const reading = clamp(window.scrollY / pageLength);
      if (readingProgress.current) readingProgress.current.style.transform = `scaleX(${reading})`;

      const updateReveal = (element: HTMLElement, bounds: DOMRect) => {
        const state = getHomeRevealState(bounds, viewport, motion.matches);
        if (state === "visible") {
          if (!("inView" in element.dataset)) element.dataset.inView = "";
        } else {
          element.style.setProperty("--reveal-offset", state === "above" ? "-24px" : "24px");
          if ("inView" in element.dataset) delete element.dataset.inView;
        }
      };

      copies.forEach((copy, index) => updateReveal(copy, copyBounds[index]));
      positions.forEach((position, index) => {
        const progress = motion.matches ? .5 : clamp((viewport - position.top) / (viewport + position.height));
        scenes[index].style.setProperty("--travel", (progress - .5).toFixed(4));
      });
      if (curtain && finaleBounds) {
        const inset = motion.matches ? 0 : clamp(finaleBounds.top / viewport);
        curtain.style.setProperty("--curtain-y", `${(-100 * inset).toFixed(1)}px`);
      }
      page?.toggleAttribute("data-scrolled", window.scrollY > 48);

      if (heroBounds) {
        const shift = motion.matches ? 0 : 24 * clamp(-heroBounds.top / heroBounds.height);
        hero.current?.style.setProperty("--scene-shift", `${shift.toFixed(2)}px`);
      }
    };

    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    const syncMotion = () => {
      if (frame) window.cancelAnimationFrame(frame);
      update();
      if (page) page.dataset.motion = motion.matches ? "reduced" : "enabled";
    };
    const measurements = new ResizeObserver(schedule);
    measurements.observe(document.body);
    motion.addEventListener("change", syncMotion);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    syncMotion();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", syncMotion);
      measurements.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      if (page) delete page.dataset.motion;
    };
  }, []);

  return (
    <>
      <div className="reading-progress" aria-hidden="true"><span ref={readingProgress} /></div>
      <section className="spatial-hero" ref={hero} aria-labelledby="hero-title">
        <HeroStarfield />
        <div className="hero-grid page-container">
          <div className="spatial-copy">
            <HeroInkTitle locale={locale} />
            <div className="hero-actions">
              <button className="button spatial-action pixel-button" onClick={onStart}>{t("开始留学生活", "Начать студенческую жизнь")}<ArrowUpRight size={19} aria-hidden="true" /></button>
              <a className="button spatial-secondary pixel-button pixel-button--secondary" href="#about">{t("探索 StudentPath", "О StudentPath")}<ArrowDown size={17} aria-hidden="true" /></a>
            </div>
          </div>
          <div className="spatial-stage hero-stage">
            <JourneyScene />
          </div>
        </div>
      </section>

      <UniversityMarquee locale={locale} />
      <section className="journey-story tunnel-story" ref={story} id="about" aria-label={t("探索留学生活", "Студенческая жизнь")}>
        {chapters.map((chapter, index) => (
          <article className={`journey-chapter tunnel-chapter tunnel-chapter--${index}`} id={chapter.id} key={chapter.id}>
            <div className="tunnel-scene">
              <PerspectiveTunnel index={index} locale={locale} />
              <Constellation name={chapter.constellation} />
              <div className="journey-copy" data-copy-anchor="" data-sky-field="">
                <div data-reveal="">
                  <h2 className="chapter-ink-title">
                    <InkTitleDoodle kind={chapter.doodle} /><span>{chapter.title[locale]}</span>
                  </h2>
                  <p>{chapter.description[locale]}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
