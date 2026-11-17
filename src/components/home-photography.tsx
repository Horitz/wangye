"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, MapPin, Pause, Play } from "lucide-react";
import { homeImages } from "@/data/home-images";
import type { Locale } from "@/lib/home-store";

const ROTATION_MS = 6000;

export function ReadingProgress() {
  const indicator = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sync = () => {
      const page = document.documentElement;
      const range = page.scrollHeight - page.clientHeight;
      const progress = range > 0 ? Math.max(0, Math.min(1, window.scrollY / range)) : 0;
      if (indicator.current) indicator.current.style.transform = `scaleX(${progress})`;
    };
    const size = new ResizeObserver(sync);
    size.observe(document.body);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
    return () => {
      size.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return <div className="reading-progress" aria-hidden="true"><span ref={indicator} /></div>;
}

export function PhotoHero({ locale, onExplore, dialogOpen }: {
  locale: Locale;
  onExplore: () => void;
  dialogOpen: boolean;
}) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [inView, setInView] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const count = homeImages.length;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(media.matches);
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    if (hero.current) observer.observe(hero.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  const rotating = inView && pageVisible && !paused && !reducedMotion && !focused && !hovered && !dialogOpen;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setSlide((slide + 1) % count), ROTATION_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, slide, count]);

  const selectSlide = (next: number) => setSlide((next + count) % count);

  return (
    <section
      ref={hero}
      className="photo-hero"
      aria-labelledby="hero-title"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="hero-photographs">
        {homeImages.map((photo, index) => (
          <div className={index === slide ? "hero-photo is-active" : "hero-photo"}
            aria-hidden={index !== slide} key={photo.id} data-photo={photo.id}>
            <Image src={photo.src} alt={photo.alt[locale]} fill sizes="100vw"
              preload={index === 0} loading={index === 0 ? undefined : "eager"} />
          </div>
        ))}
      </div>
      <div className="photo-shade" aria-hidden="true" />
      <div className="photo-content page-container">
        <p className="photo-kicker">{t("StudentPath · 俄罗斯留学指南", "StudentPath · Гид по учёбе в России")}</p>
        <h1 className="photo-title" id="hero-title">
          {t("从莫斯科开始，", "Новая жизнь")}<br />{t("开启留学生活。", "в Москве.")}
        </h1>
        <p className="photo-description">{t("为在俄罗斯读书的你，整理从入学到日常的办事指南。", "Понятные инструкции для студентов в России: от поступления до повседневных дел.")}</p>
        <button className="button photo-action" onClick={onExplore}>{t("探索办事指南", "Открыть инструкции")}<ArrowRight size={19} /></button>
      </div>
      <div className="photo-bottom page-container">
        <a className="scroll-cue" href="#about"><span><ArrowDown size={17} /></span>{t("向下探索", "Смотреть дальше")}</a>
        <div className="photo-carousel-ui" role="group" aria-label={t("照片轮播", "Фотогалерея")}>
          <p className="photo-caption" aria-live={rotating ? "off" : "polite"}>
            <MapPin size={16} aria-hidden="true" />{homeImages[slide].location[locale]}
          </p>
          <div className="slideshow-controls"
            onKeyDown={event => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                selectSlide(slide + (event.key === "ArrowLeft" ? -1 : 1));
              }
            }}>
            <button className="slideshow-button" onClick={() => selectSlide(slide - 1)} aria-label={t("上一张照片", "Предыдущая фотография")}><ArrowLeft size={18} /></button>
            <div className="slide-dots">
              {homeImages.map((photo, index) => <button key={photo.id} onClick={() => selectSlide(index)}
                aria-label={photo.location[locale]} aria-pressed={slide === index}><span /></button>)}
            </div>
            <button className="slideshow-button" onClick={() => selectSlide(slide + 1)} aria-label={t("下一张照片", "Следующая фотография")}><ArrowRight size={18} /></button>
            {!reducedMotion && <button className="slideshow-button" onClick={() => setPaused(!paused)}
              aria-label={paused ? t("播放照片轮播", "Включить автопоказ") : t("暂停照片轮播", "Приостановить автопоказ")}>
              {paused ? <Play size={17} /> : <Pause size={17} />}
            </button>}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CampusGallery({ locale }: { locale: Locale }) {
  return (
    <section id="gallery" aria-labelledby="gallery-title">
      <div className="story-heading page-container">
        <h2 id="gallery-title">{locale === "zh" ? "留学掠影" : "Кадры из Москвы"}</h2>
      </div>
      <div className="story-gallery page-container">
        {homeImages.map(photo => (
          <figure className="story-card" key={photo.id}>
            <div className="story-image" data-photo={photo.id}>
              <Image src={photo.src} alt={photo.alt[locale]} fill
                sizes="(max-width: 699px) 100vw, (max-width: 1023px) 34vw, 490px" />
            </div>
            <figcaption className="story-caption">{photo.location[locale]}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
