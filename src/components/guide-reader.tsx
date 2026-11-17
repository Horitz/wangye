"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Bookmark, BookOpen, ChevronDown, ExternalLink, Pencil, ShieldAlert } from "lucide-react";
import { PostByline } from "@/components/content-post";
import { ContentTags } from "@/components/content-tags";
import { EditorialPostCover } from "@/components/editorial-post-cover";
import { PublishedGuideGallery } from "@/components/published-guide-gallery";
import { EditorialEditor } from "@/components/editorial-editor";
import { useEditorialDocument } from "@/lib/editorial-store";
import { useCommunityRemoteState } from "@/lib/community-remote-store";
import { useGuideCoverMotion } from "@/components/use-guide-cover-motion";
import type { GuidePreview } from "@/data/home-content";
import { AddToPersonalPlan } from "@/components/add-to-personal-plan";
import { PublishedStepDetails } from "@/components/published-step-details";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { toggleSaved, useHomeState } from "@/lib/home-store";

export function GuideReader({ guide, onGuideChange, onOpenPersonal }: { guide: GuidePreview; onGuideChange?: (id: string) => void; onOpenPersonal?: () => void }) {
  return <EditorialPostReader documentId={guide.id} guide={guide} onGuideChange={onGuideChange} onOpenPersonal={onOpenPersonal} />;
}

export function EditorialPostReader({ documentId, guide, onGuideChange, onOpenPersonal }: { documentId: string; guide?: GuidePreview; onGuideChange?: (id: string) => void; onOpenPersonal?: () => void }) {
  const state = useHomeState();
  const { locale } = state;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const { document: content, loading, error, save, reload } = useEditorialDocument(documentId);
  const remote = useCommunityRemoteState();
  const canEdit = remote.sessionStatus === "ready" && remote.session?.authenticated;
  const [editing, setEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const coverStage = useRef<HTMLDivElement>(null);
  useGuideCoverMotion(scrollArea, coverStage, !editing && Boolean(content));
  const saved = state.saved.includes(documentId);
  function finishEditing() {
    setEditing(false);
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    requestAnimationFrame(() => editButton.current?.focus({ preventScroll: true }));
  }
  if (!content) return <div className="guide-reader"><div className="guide-reader-article"><p role="status">{loading ? t("正在加载攻略…", "Загрузка статьи…") : t("暂时无法读取攻略。", "Не удалось загрузить статью.")}</p>{error && <button type="button" className="button secondary" disabled={loading} onClick={reload}>{t("重新加载", "Повторить загрузку")}</button>}</div></div>;
  return <div className="guide-reader">
    <div className="guide-reader-scroll" ref={scrollArea}>
      {editing ? <EditorialEditor document={content} locale={locale} onCancel={finishEditing} onSave={async next => { await save(next); finishEditing(); setSavedMessage(true); }} /> : <>
      {canEdit && <div className="guide-reader-edit-bar"><button ref={editButton} className="button secondary material-glass" type="button" disabled={loading || error} onClick={() => { setSavedMessage(false); setEditing(true); if (scrollArea.current) scrollArea.current.scrollTop = 0; }}><Pencil size={18} />{t("编辑内容", "Редактировать")}</button>{savedMessage && <span role="status">{t("已保存", "Сохранено")}</span>}</div>}
      <section tabIndex={-1} aria-label={content.title[locale]} className="guide-reader-article-panel">
        <div className="guide-cover-stage" ref={coverStage} onFocusCapture={event => {
          // Sticky image tools must be uncovered when reached by the keyboard.
          if (event.target instanceof HTMLElement && event.target.matches(":focus-visible") && !coverStage.current?.querySelector(".guide-media-editor") && scrollArea.current && scrollArea.current.scrollTop > 0) scrollArea.current.scrollTop = 0;
        }}>
          <PublishedGuideGallery images={content.images} locale={locale} fallbackContent={<EditorialPostCover id={content.sectionId ?? documentId} title={content.title[locale]} locale={locale} />} />
        </div>
        <article className="guide-reader-article material-glass material-glass--raised">
          <div className="guide-reader-title"><div className="guide-reader-title-row"><div><p className="guide-reader-kicker">{documentId === "essentials" ? t("入学必看", "С чего начать") : t("办事指南", "Инструкция")}</p><h1>{content.title[locale]}</h1></div><GuidanceIllustration kind="book" className="guide-reader-companion" /></div><div className="guide-post-byline"><PostByline name={content.author.name[locale]} detail={content.author.role[locale]} /></div></div>
          <ContentTags tags={content.tags} hrefForTag={tag => `/explore${content.sectionId ? `/${content.sectionId}` : ""}?tag=${encodeURIComponent(tag)}`} onNavigate={onOpenPersonal} />
          {guide?.status === "review-needed" && <p className="editorial-post-warning"><ShieldAlert size={16} />{t("要求需核实", "Требования требуют уточнения")}</p>}
          {error && <div className="guide-reader-edit-bar"><p className="admission-feedback" role="status">{loading ? t("正在重新加载…", "Загрузка…") : t("暂未读取到站点更新。", "Не удалось загрузить обновления.")}</p><button type="button" className="button secondary" disabled={loading} onClick={reload}>{t("重新加载", "Повторить загрузку")}</button></div>}
          {content.summary[locale] && <p className="guide-reader-lead">{content.summary[locale]}</p>}
          <section className="guide-reader-story" aria-label={t("指南正文", "Текст инструкции")}>
            {content.steps.map((step, index) => <section key={step.id}><div className="guide-reader-story-heading"><span>{String(index + 1).padStart(2, "0")}</span><h2>{step.title[locale]}</h2></div><PublishedStepDetails step={step} locale={locale} /></section>)}
          </section>
          {content.sources.length > 0 && <details className="guide-reader-sources"><summary><BookOpen size={18} /><span>{t("来源", "Источники")}</span><ChevronDown size={18} /></summary><div>{content.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label[locale] || source.url}<ExternalLink size={16} /></a>)}</div></details>}
          {documentId === "visa-extension" && <Link className="guide-reader-next" href="/guides/residence-registration" onClick={event => { if (onGuideChange && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onGuideChange("residence-registration"); } }}><span><strong>{t("接下来，看看居住登记", "Далее — регистрация")}</strong></span><ArrowRight size={20} /></Link>}
        </article>
      </section>
      </>}
      {state.storageUnavailable && <p className="guide-reader-storage" role="status">{t("浏览器无法保存，本次记录仅在当前会话中保留。", "Хранилище недоступно. Отметки сохранятся только в этом сеансе.")}</p>}
    </div>
    {!editing && <footer className="guide-reader-footer material-glass material-glass--raised">
      <AddToPersonalPlan document={content} disabled={loading || error} onOpenPersonal={onOpenPersonal} />
      {documentId !== "essentials" && <button className="icon-button guide-reader-save" type="button" aria-label={saved ? t("取消收藏指南", "Убрать инструкцию из сохранённого") : t("收藏指南", "Сохранить инструкцию")} title={saved ? t("已收藏", "Сохранено") : t("收藏指南", "Сохранить инструкцию")} aria-pressed={saved} onClick={() => toggleSaved(documentId)}><Bookmark size={22} fill={saved ? "currentColor" : "none"} /></button>}
    </footer>}
  </div>;
}
