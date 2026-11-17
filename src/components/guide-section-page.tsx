"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Bookmark, Check, ChevronRight, PenLine, Search, X } from "lucide-react";
import { GuideComposer } from "@/components/guide-composer";
import { collectTagCounts, TagFilter } from "@/components/content-tags";
import { GuideCatalogStatus, GuidePostCard, exploreCategories, normalizeGuideSearch } from "@/components/guide-post-card";
import { useGuideCatalogFocus, useGuideSearchDraft } from "@/components/guide-catalog-interactions";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { LanguageMenu } from "@/components/language-menu";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import type { GuideSection } from "@/data/guide-sections";
import { useCommunityRemoteState } from "@/lib/community-remote-store";
import { useEditorialCatalog } from "@/lib/editorial-store";
import { useHomeState } from "@/lib/home-store";
import { normalizeTag, tagKey } from "@/lib/content-tags.mjs";

function SectionContent({ section, initialQuery, savedOnly, selectedTag, returnHref, canWrite, published, onWrite }: {
  section: GuideSection;
  initialQuery: string;
  savedOnly: boolean;
  selectedTag: string;
  returnHref: string;
  canWrite: boolean;
  published: boolean;
  onWrite: () => void;
}) {
  const router = useRouter();
  const state = useHomeState();
  const locale = state.locale;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const { guides, loading, error, reload } = useEditorialCatalog();
  const [query, setQuery] = useGuideSearchDraft(returnHref, initialQuery);
  const searchInput = useRef<HTMLInputElement>(null);
  const { catalog, savedFilter, beforeUnsave } = useGuideCatalogFocus();
  const category = exploreCategories.find(item => item.id === section.category)!;
  const sectionGuides = guides.filter(guide => guide.sectionId === section.id);
  const normalizedQuery = normalizeGuideSearch(initialQuery);
  const candidates = sectionGuides.filter(guide => (!savedOnly || state.saved.includes(guide.id)) && normalizeGuideSearch([
    guide.title.zh, guide.title.ru, guide.summary.zh, guide.summary.ru, ...guide.keywords, ...(guide.tags ?? []),
  ].join(" ")).includes(normalizedQuery));
  const tagItems = collectTagCounts(candidates);
  const results = candidates.filter(guide => !selectedTag || guide.tags?.some(tag => tagKey(tag) === tagKey(selectedTag)));

  function navigate(next: { q?: string; saved?: boolean; tag?: string } = {}) {
    const params = new URLSearchParams(returnHref.split("?")[1]);
    const nextQuery = (next.q ?? query).trim();
    const nextTag = next.tag ?? selectedTag;
    if (nextQuery) params.set("q", nextQuery);
    else params.delete("q");
    if (next.saved ?? savedOnly) params.set("saved", "1");
    else params.delete("saved");
    if (nextTag) params.set("tag", nextTag);
    else params.delete("tag");
    router.push(`/explore/${section.id}${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); navigate(); }

  return <div ref={catalog} className="workspace-container explore-page guide-section-page">
    <nav className="guide-section-breadcrumb" aria-label={t("面包屑导航", "Навигационная цепочка")}>
      <Link href="/explore">{t("办事指南", "Инструкции")}</Link><ChevronRight size={18} aria-hidden="true" /><span aria-current="page">{section.title[locale]}</span>
    </nav>
    <div className="guide-section-intro">
      <div className="workspace-heading explore-heading-scene"><p className="workspace-eyebrow">{category[locale]}</p><h1>{section.title[locale]}</h1><p>{section.summary[locale]}</p><GuidanceIllustration kind="book" className="explore-heading-companion" /></div>
      {canWrite && <button className="button button-sticker guide-section-write" type="button" aria-haspopup="dialog" onClick={onWrite}><PenLine size={19} aria-hidden="true" />{t("写攻略", "Написать статью")}</button>}
    </div>
    {published && <p className="guide-section-published" role="status"><Check size={18} aria-hidden="true" />{t("攻略已发布。", "Статья опубликована.")}</p>}
    <section className="explore-search-panel" aria-label={t("搜索本分区", "Поиск в разделе")}>
      <form className="explore-search-form" role="search" onSubmit={search}>
        <label className="sr-only" htmlFor="section-query">{t("搜索本分区攻略", "Поиск статей в этом разделе")}</label>
        <div className="explore-search-input"><Search size={22} aria-hidden="true" /><input ref={searchInput} id="section-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("搜索本分区攻略", "Поиск в этом разделе")} />{query && <button className="icon-button" type="button" aria-label={t("清空搜索", "Очистить поиск")} onClick={() => { setQuery(""); searchInput.current?.focus({ preventScroll: true }); navigate({ q: "" }); }}><X size={18} aria-hidden="true" /></button>}</div>
        <button className="button button-sticker" type="submit">{t("搜索", "Найти")}</button>
      </form>
      <TagFilter items={tagItems} selected={selectedTag} onSelect={tag => navigate({ tag })} />
    </section>
    <div className="explore-results-heading"><div><h2>{savedOnly ? t("收藏的攻略", "Сохранённые статьи") : normalizedQuery ? t("搜索结果", "Результаты поиска") : t("分区攻略", "Статьи раздела")}</h2>{!loading && !error && <p role="status">{t(`共 ${results.length} 篇攻略`, `Статей: ${results.length}`)}</p>}</div><button ref={savedFilter} className={`button secondary explore-saved-filter${savedOnly ? " is-active" : ""}`} type="button" aria-pressed={savedOnly} onClick={() => navigate({ saved: !savedOnly })}><Bookmark size={18} aria-hidden="true" />{t("只看收藏", "Только сохранённое")}</button></div>
    <GuideCatalogStatus loading={loading} error={error} onRetry={reload} />
    {!loading && !error && (results.length ? <div className="explore-grid">{results.map(guide => <GuidePostCard key={guide.id} guide={guide} locale={locale} returnHref={returnHref} onUnsave={beforeUnsave} />)}</div> : <section className="explore-empty">
      <GuidanceIllustration kind={savedOnly ? "book" : "search"} animated={false} />
      <h2>{normalizedQuery || savedOnly || selectedTag ? t("没有匹配的攻略", "Подходящих статей нет") : t("这里还没有攻略", "В этом разделе пока нет статей")}</h2>
      {normalizedQuery || savedOnly || selectedTag ? <button className="button button-sticker" type="button" onClick={() => { setQuery(""); searchInput.current?.focus({ preventScroll: true }); router.push(`/explore/${section.id}`, { scroll: false }); }}>{t("查看本分区全部攻略", "Все статьи раздела")}</button> : <Link className="button secondary" href="/explore">{t("看看其他分区", "Другие разделы")}</Link>}
    </section>)}
  </div>;
}

export default function GuideSectionPage({ section }: { section: GuideSection }) {
  const params = useSearchParams();
  const router = useRouter();
  const { locale } = useHomeState();
  const remote = useCommunityRemoteState();
  const [composerOpen, setComposerOpen] = useState(false);
  const [published, setPublished] = useState(false);
  let selectedTag = "";
  try { selectedTag = normalizeTag(params.get("tag") ?? ""); } catch { /* Ignore invalid URL tags without hiding the section. */ }
  const returnHref = `/explore/${section.id}${params.size ? `?${params}` : ""}`;

  return <>
    <SectionContent section={section} initialQuery={params.get("q") ?? ""} savedOnly={params.get("saved") === "1"} selectedTag={selectedTag} returnHref={returnHref}
      canWrite={remote.sessionStatus === "ready" && Boolean(remote.session?.authenticated)} published={published}
      onWrite={() => { setPublished(false); setComposerOpen(true); }} />
    <WorkspaceDialog open={composerOpen} onClose={() => setComposerOpen(false)} variant="guide" title={locale === "zh" ? "写攻略" : "Написать статью"} headerActions={<LanguageMenu tone="light" />}>
      <GuideComposer sectionId={section.id} onCancel={() => setComposerOpen(false)} onCreated={() => {
        setComposerOpen(false);
        setPublished(true);
        if (params.size) router.replace(`/explore/${section.id}`, { scroll: false });
      }} />
    </WorkspaceDialog>
  </>;
}
