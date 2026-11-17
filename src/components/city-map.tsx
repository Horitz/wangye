"use client";

import { useId, useState, type FormEvent } from "react";
import { ExternalLink, MapPin, RefreshCw, Search } from "lucide-react";
import { useHomeState } from "@/lib/home-store";
import { FrameCreature } from "@/components/frame-creature";
import { getTwoGisSearchUrl, TWO_GIS_PLACE_NAME, TWO_GIS_PLACE_URL, TWO_GIS_WIDGET_URL } from "@/lib/map-links";
import "@/app/city-map.css";

/** The official map stays on the page; the search form opens 2GIS's full search. */
export function CityMapSection() {
  const { locale } = useHomeState();
  const [query, setQuery] = useState("");
  const [emptyQuery, setEmptyQuery] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const [frameState, setFrameState] = useState<"loading" | "loaded" | "error">("loading");
  const id = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;

  function search(event: FormEvent<HTMLFormElement>) {
    if (!query.trim()) {
      event.preventDefault();
      setEmptyQuery(true);
      event.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
    }
  }

  function reloadMap() {
    setFrameState("loading");
    setFrameVersion(value => value + 1);
  }

  return <section id="city-map" className="city-map material-glass creature-frame" tabIndex={-1} aria-labelledby={`${id}-title`}>
    <FrameCreature kind="axolotl" placement="side-right" />
    <header className="city-map-heading">
      <div><h2 id={`${id}-title`}><MapPin size={24} aria-hidden="true" />{t("莫斯科地图", "Карта Москвы")}</h2><p lang="ru">{TWO_GIS_PLACE_NAME}</p></div>
      <a className="button secondary material-glass" href={TWO_GIS_PLACE_URL} target="_blank" rel="noopener noreferrer" aria-label={t("打开这张 2GIS 地图（新标签页）", "Открыть эту карту в 2ГИС (новая вкладка)")}>{t("打开完整地图", "Открыть в 2ГИС")}<ExternalLink size={18} aria-hidden="true" /></a>
    </header>

    <form className="city-map-search" action={getTwoGisSearchUrl(query)} method="get" target="_blank" rel="noopener noreferrer" onSubmit={search}>
      <label className="city-map-search-field" htmlFor={`${id}-query`}><span>{t("找地点", "Найти место")}</span><span className="city-map-search-input"><Search size={20} aria-hidden="true" /><input id={`${id}-query`} type="search" value={query} onChange={event => { setQuery(event.target.value); setEmptyQuery(false); }} maxLength={200} required placeholder={t("搜索学校、医院或俄语地址", "Название места или адрес")} aria-invalid={emptyQuery || undefined} aria-describedby={`${id}-hint${emptyQuery ? ` ${id}-error` : ""}`} /></span></label>
      <button type="submit" className="button primary" aria-label={t("在 2GIS 搜索（新标签页）", "Найти в 2ГИС (новая вкладка)")}>{t("在 2GIS 搜索", "Найти в 2ГИС")}<ExternalLink size={18} aria-hidden="true" /></button>
    </form>
    <p id={`${id}-hint`} className="city-map-search-hint">{t("搜索结果在 2GIS 的新标签页打开。", "Результаты поиска откроются в новой вкладке 2ГИС.")}</p>
    {emptyQuery && <p id={`${id}-error`} className="city-map-error" role="alert">{t("先输入地点名称或地址。", "Введите название места или адрес.")}</p>}

    <div className="city-map-frame">
      <iframe key={frameVersion} src={TWO_GIS_WIDGET_URL} title={t(`2GIS 莫斯科地图：${TWO_GIS_PLACE_NAME}`, `Карта 2ГИС: ${TWO_GIS_PLACE_NAME}`)} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setFrameState("loaded")} onError={() => setFrameState("error")} />
      {frameState === "loading" && <p className="city-map-loading" role="status">{t("正在加载地图…", "Загружаем карту…")}</p>}
    </div>
    <footer className="city-map-footer">
      {frameState === "error" && <p className="city-map-error" role="status">{t("地图暂时未加载，可以重新载入。", "Карта не загрузилась. Попробуйте ещё раз.")}</p>}
      <button type="button" className="text-button" onClick={reloadMap}><RefreshCw size={17} aria-hidden="true" />{t("重新载入地图", "Перезагрузить карту")}</button>
    </footer>
  </section>;
}
