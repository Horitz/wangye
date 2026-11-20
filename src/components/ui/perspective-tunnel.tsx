"use client";

import Image from "next/image";
import type { Locale } from "@/lib/home-store";

type Photo = { file: string; zh: string; ru: string };

const scenes: Photo[][] = [
  [
    { file: "basil", zh: "雪中的圣瓦西里大教堂", ru: "Собор Василия Блаженного в снегу" },
    { file: "kremlin-day", zh: "游船驶过莫斯科河畔的克里姆林宫", ru: "Теплоход у стен Кремля на Москве-реке" },
    { file: "zaryadye", zh: "扎里亚季耶公园与远处的莫斯科城区", ru: "Парк «Зарядье» и город вдали" },
  ],
  [
    { file: "autumn", zh: "秋叶覆盖的什柳佐瓦亚河岸步道", ru: "Осенняя аллея на Шлюзовой набережной" },
    { file: "tsaritsyno", zh: "察里津诺公园绿树间的石塔", ru: "Башня-руина среди деревьев в Царицыне" },
    { file: "spring", zh: "莫斯科花园里的绿地和树木", ru: "Деревья и лужайка в московском саду" },
  ],
  [
    { file: "sunset", zh: "落日中的莫斯科城市天际线", ru: "Закат над московскими высотками" },
    { file: "snowfall", zh: "红场夜色中的游人和亮灯的教堂", ru: "Люди на Красной площади у освещённого собора" },
    { file: "kremlin-night", zh: "夜色中亮起灯的克里姆林宫河岸", ru: "Подсвеченные стены Кремля над ночной рекой" },
  ],
];

export function PerspectiveTunnel({ index, locale }: { index: number; locale: Locale }) {
  return <div className="tunnel-gallery" onPointerMove={event => {
    if (event.pointerType !== "mouse" || !window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)").matches) return;
    const gallery = event.currentTarget;
    const bounds = gallery.getBoundingClientRect();
    gallery.style.setProperty("--pan-x", `${12 * ((event.clientX - bounds.left) / bounds.width - .5)}px`);
    gallery.style.setProperty("--pan-y", `${10 * ((event.clientY - bounds.top) / bounds.height - .5)}px`);
  }} onPointerLeave={event => {
    event.currentTarget.style.removeProperty("--pan-x");
    event.currentTarget.style.removeProperty("--pan-y");
  }}>
    <div className="tunnel-camera">
      {scenes[index].map((photo, position) => <figure className={`tunnel-print tunnel-print--${position}`} key={photo.file}>
        <div className="tunnel-mount">
          <Image src={`/images/moscow/${photo.file}.jpg`} alt={photo[locale]} fill sizes={position === 2 ? "(max-width: 899px) 1px, 14vw" : "(max-width: 899px) 52vw, 25vw"} />
        </div>
      </figure>)}
    </div>
  </div>;
}
