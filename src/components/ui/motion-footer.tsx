"use client";

import { ArrowUp, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { InkTitleDoodle } from "@/components/ink-title-doodle";
import type { Locale } from "@/lib/home-store";

export function MotionFooter({ locale, onStart }: { locale: Locale; onStart: () => void }) {
  const zh = locale === "zh";
  return <footer id="start" className="home-curtain" aria-labelledby="finale-title">
    <div className="curtain-scenery" aria-hidden="true">
      <b className="curtain-wordmark">StudentPath.</b>
    </div>
    <div className="curtain-content">
      <div data-copy-anchor="" data-sky-field="">
        <div data-reveal="">
          <h2 id="finale-title" className="ink-finale-title">
            <span className="ink-finale-phrase">
              <span className="ink-finale-perch"><InkTitleDoodle kind="fox" /><span className="ink-finale-print">{zh ? "准" : "Готовы"}</span></span>
              {zh && <span className="ink-finale-print">备好，</span>}
            </span>{zh ? <wbr /> : " "}
            <span className="ink-finale-phrase">
              <span className="ink-finale-print">{zh ? "开启新生" : "к новой "}</span>
              <span className="ink-finale-end"><span className="ink-finale-print">{zh ? "活。" : "главе?"}</span><InkTitleDoodle kind="luggage" /></span>
            </span>
          </h2>
          <p>{zh ? "下一段旅程，从这里开始。" : "Ваше новое путешествие начинается здесь."}</p>
        </div>
      </div>
      <div className="curtain-actions" onPointerMove={event => {
        if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
        const link = event.target.closest<HTMLElement>(".curtain-link");
        if (!link) return;
        const bounds = link.getBoundingClientRect();
        link.style.setProperty("--magnet-x", `${8 * ((event.clientX - bounds.left) / bounds.width - .5)}px`);
        link.style.setProperty("--magnet-y", `${6 * ((event.clientY - bounds.top) / bounds.height - .5)}px`);
      }}>
        <button type="button" className="curtain-link curtain-link--start" onClick={onStart}>{zh ? "开始留学生活" : "Начать студенческую жизнь"}<ArrowUpRight /></button>
      </div>
    </div>
    <div className="curtain-base page-container">
      <Brand light />
      <a href="#top" className="curtain-top" aria-label={zh ? "返回页首" : "Наверх"}><ArrowUp aria-hidden="true" /></a>
    </div>
  </footer>;
}
