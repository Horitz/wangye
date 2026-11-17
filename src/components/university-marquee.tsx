"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { getSchool } from "@/data/school-options";
import type { Locale } from "@/lib/home-store";

const cities = {
  moscow: { zh: "莫斯科", ru: "Москва" },
  petersburg: { zh: "圣彼得堡", ru: "Санкт-Петербург" },
  kazan: { zh: "喀山", ru: "Казань" },
  dolgoprudny: { zh: "多尔戈普鲁德内", ru: "Долгопрудный" },
};

// The landing gallery has its own roster. Only school-options defines community access.
const universities = [
  { id: "msu", name: getSchool("msu").label, acronym: "МГУ", city: cities.moscow },
  { id: "rudn", name: getSchool("rudn").label, acronym: "РУДН", city: cities.moscow },
  { id: "spbu", name: { zh: "圣彼得堡国立大学", ru: "Санкт-Петербургский университет" }, acronym: "СПбГУ", city: cities.petersburg },
  { id: "kfu", name: { zh: "喀山联邦大学", ru: "Казанский федеральный университет" }, acronym: "КФУ", city: cities.kazan },
  { id: "hse", name: getSchool("hse").label, acronym: "НИУ ВШЭ", city: cities.moscow },
  { id: "itmo", name: { zh: "圣彼得堡信息技术机械与光学大学", ru: "Университет ИТМО" }, acronym: "ИТМО", city: cities.petersburg },
  { id: "mipt", name: { zh: "莫斯科物理技术学院", ru: "Московский физико-технический институт" }, acronym: "МФТИ", city: cities.dolgoprudny },
  { id: "spbpu", name: { zh: "圣彼得堡彼得大帝理工大学", ru: "Политех Петра Великого" }, acronym: "СПбПУ", city: cities.petersburg },
  { id: "misis", name: { zh: "俄罗斯国立研究型技术大学（MISIS）", ru: "Университет МИСИС" }, acronym: "МИСИС", city: cities.moscow },
  { id: "mephi", name: { zh: "莫斯科国立核能研究大学", ru: "Национальный исследовательский ядерный университет" }, acronym: "НИЯУ МИФИ", city: cities.moscow },
];

type University = (typeof universities)[number];
type Hint = { uni: University; x: number; y: number; pinned: boolean };

export function UniversityMarquee({ locale }: { locale: Locale }) {
  const section = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);

  useEffect(() => {
    const element = section.current;
    if (!element || !("IntersectionObserver" in window)) return;
    let inView = false;
    const sync = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      setEnhanced(true);
      if (!inView) setHint(null);
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!hint) return;
    const dismiss = () => setHint(null);
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(".uni-marquee__mark")) dismiss();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", dismiss);
    };
  }, [hint]);

  function show(uni: University, mark: HTMLElement, pinned = false) {
    const box = mark.getBoundingClientRect();
    const bounds = section.current!.getBoundingClientRect();
    setHint({ uni, x: box.left + box.width / 2 - bounds.left, y: box.bottom - bounds.top + 8, pinned });
  }

  const title = locale === "zh" ? "俄罗斯高校" : "Университеты России";
  const buttonLabel = locale === "zh"
    ? (paused ? "继续滚动校徽" : "暂停滚动校徽")
    : (paused ? "Продолжить прокрутку" : "Приостановить прокрутку");
  return (
    <section ref={section} id="universities" className="uni-marquee" aria-label={title}
      data-enhanced={enhanced} data-running={visible && !paused && !hint}>
        <button type="button" className="uni-marquee__control" onClick={() => setPaused(value => !value)}
          aria-label={buttonLabel} aria-controls="university-belt">
          {paused ? <Play size={15} /> : <Pause size={15} />}{buttonLabel}
        </button>
        <div className="uni-marquee__viewport" id="university-belt" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            event.currentTarget.scrollLeft = 0;
            setHint(null);
          }
        }}>
          <div className="uni-marquee__track">
            {[false, true].map(copy => (
              <ul key={String(copy)} className="uni-marquee__group" aria-hidden={copy || undefined}>
                {universities.map(uni => {
                  const mark = <Image unoptimized loading="eager" src={`/images/universities/${uni.id}.png`} width={72} height={72} alt="" />;
                  const caption = `${uni.name[locale]} · ${uni.city[locale]}`;
                  return <li className="uni-marquee__school" key={uni.id}
                    onPointerEnter={event => { if (event.pointerType === "mouse") show(uni, event.currentTarget); }}
                    onPointerLeave={() => setHint(current => current?.pinned ? current : null)}
                    onClick={event => {
                      if (hint?.uni.id === uni.id && hint.pinned) setHint(null);
                      else show(uni, event.currentTarget, true);
                    }}>
                    {copy ? <span className="uni-marquee__mark" data-school={uni.id}>{mark}</span> :
                      <button type="button" className="uni-marquee__mark" data-school={uni.id} aria-label={caption}
                        onFocus={event => {
                          const button = event.currentTarget;
                          if (button.matches(":focus-visible")) {
                            button.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
                            show(uni, button, true);
                          }
                        }}>{mark}</button>}
                  </li>;
                })}
              </ul>
            ))}
          </div>
        </div>
        {hint && <div className="uni-marquee__hint" aria-hidden="true"
          style={{ "--hint-x": `${hint.x}px`, top: hint.y } as CSSProperties}>
          <strong>{hint.uni.name[locale]}</strong>
          <span><span lang="ru">{hint.uni.acronym}</span> · {hint.uni.city[locale]}</span>
        </div>}
    </section>
  );
}
