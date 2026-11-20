"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Compass, MessagesSquare, Pencil } from "lucide-react";
import { EssentialsDialog } from "@/components/essentials-content";
import { HubWelcomeCharacter } from "@/components/hub-welcome-character";
import { SketchSticker } from "@/components/campus-sketch";
import { useHomeState } from "@/lib/home-store";
import { useHubContent } from "@/lib/hub-store";
import { useCommunityRemoteState } from "@/lib/community-remote-store";
import { HubEditor } from "@/components/hub-editor";
import { LanguageMenu } from "@/components/language-menu";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { LifeTipsCompanionDock } from "@/components/life-tips-panel";
import { DragonLandmarks } from "@/components/dragon-landmarks";
import { CityMapSection } from "@/components/city-map";
import { FrameCreature } from "@/components/frame-creature";

export function StudentHub() {
  const { locale } = useHomeState();
  const [essentialsOpen, setEssentialsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const { document: content, loading, error, save } = useHubContent();
  const remote = useCommunityRemoteState();
  const isAdmin = remote.sessionStatus === "ready" && remote.session?.authenticated;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const destinations = [
    { href: null, icon: BookOpen, tone: "lilac" },
    { href: "/explore", icon: Compass, tone: "yellow" },
    { href: "/community", icon: MessagesSquare, tone: "teal" },
  ];
  return <div className="workspace-container student-hub">
    {isAdmin && <div className="hub-editor-toolbar">{saved && <span role="status">{t("本页已保存", "Страница сохранена")}</span>}<button type="button" className="button secondary material-glass" disabled={loading || error} onClick={() => { setSaved(false); setEditing(true); }}><Pencil size={18} />{t("编辑本页", "Редактировать страницу")}</button></div>}
    {error && <p className="hub-content-error" role="status">{t("暂未读取到页面更新，请刷新重试。", "Не удалось загрузить обновления. Обновите страницу.")}</p>}
    <LifeTipsCompanionDock />
    <section className="hub-welcome hub-welcome--sketch" aria-labelledby="hub-title">
      <div className="hub-welcome-copy">{content.eyebrow[locale] && <span className="hub-city">{content.eyebrow[locale]}</span>}<h1 id="hub-title">{content.title[locale]}{content.highlight[locale] && <><br /><span className="sketch-highlight">{content.highlight[locale]}<svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"><path d="M3 8Q110 0 295 6M22 12Q176 5 276 11" /></svg></span></>}</h1>{content.description[locale] && <p>{content.description[locale]}</p>}</div>
      <HubWelcomeCharacter />
    </section>
    <DragonLandmarks />
    <section className="hub-destinations" aria-label={t("选择一个去向", "Выберите раздел")}>
      {destinations.map((item, index) => { const entry = content.entries[index]; return <article key={entry.id} className={`hub-destination hub-destination--sketch hub-tone-${item.tone} creature-frame`}>
        {index === 0 && <FrameCreature kind="fox" placement="top-right" />}
        <span className="hub-destination-icon hub-sketch-icon"><SketchSticker kind={item.tone === "lilac" ? "book" : item.tone === "yellow" ? "compass" : "chat"} /></span><h2>{entry.title[locale]}</h2>{entry.description[locale] && <p>{entry.description[locale]}</p>}{item.href ? <Link className="button button-sticker hub-destination-action" href={item.href}><item.icon size={19} strokeWidth={1.75} /><span>{entry.action[locale]}</span></Link> : <button type="button" className="button button-sticker hub-destination-action" aria-haspopup="dialog" onClick={() => setEssentialsOpen(true)}><BookOpen size={19} strokeWidth={1.75} /><span>{entry.action[locale]}</span></button>}</article>; })}
    </section>
    <CityMapSection />
    <EssentialsDialog open={essentialsOpen} onClose={() => setEssentialsOpen(false)} />
    <WorkspaceDialog open={editing && Boolean(isAdmin)} onClose={() => setEditing(false)} title={t("编辑留学生活页面", "Редактировать студенческую жизнь")} variant="essentials" headerActions={<LanguageMenu tone="light" />}><HubEditor document={content} locale={locale} onCancel={() => setEditing(false)} onSave={async next => { await save(next); setEditing(false); setSaved(true); }} /></WorkspaceDialog>
  </div>;
}
