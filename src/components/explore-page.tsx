"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, type FormEvent } from "react";
import { ArrowRight, Bookmark, Search, X } from "lucide-react";
import { ContentPostCard, ContentPostCopy } from "@/components/content-post";
import { FrameCreature } from "@/components/frame-creature";
import { collectTagCounts, TagFilter } from "@/components/content-tags";
import { EditorialPostCover } from "@/components/editorial-post-cover";
import { GuidePostCard, GuideCatalogStatus, exploreCategories, normalizeGuideSearch } from "@/components/guide-post-card";
import { useGuideCatalogFocus, useGuideSearchDraft } from "@/components/guide-catalog-interactions";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { guideSections, type GuideSection } from "@/data/guide-sections";
import { useEditorialCatalog } from "@/lib/editorial-store";
import { getSchool } from "@/data/school-options";
import { useHomeState, type Locale, type Stage } from "@/lib/home-store";
import { normalizeTag, tagKey } from "@/lib/content-tags.mjs";

export { exploreCategories } from "@/components/guide-post-card";

const recommended: Record<Stage, string[]> = {
  prospective: ["university-admission", "first-week", "public-transport"],
  newArrival: ["first-week", "residence-registration", "medical-examination"],
  enrolled: ["visa-extension", "residence-registration", "medical-examination"],
};
const stageLabels: Record<Stage, { zh: string; ru: string }> = {
  prospective: { zh: "准备申请", ru: "Поступаю" },
  newArrival: { zh: "刚刚抵达", ru: "Недавно приехал" },
  enrolled: { zh: "正在就读", ru: "Уже учусь" },
};
function SectionCard({ section, locale, count }: { section: GuideSection; locale: Locale; count: number | null }) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const category = exploreCategories.find(item => item.id === section.category)!;
  return <ContentPostCard className="guide-section-card" footer={<div className="guide-section-card-footer">
    <span>{count === null ? t("攻略分区", "Раздел статей") : t(`${count} 篇攻略`, `Статей: ${count}`)}</span>
    <Link className="guide-section-card-action" href={`/explore/${section.id}`} aria-label={t(`进入${section.title.zh}分区`, `Открыть раздел: ${section.title.ru}`)}>{t("进入分区", "Открыть раздел")}<ArrowRight size={18} aria-hidden="true" /></Link>
  </div>}>
    <Link className="content-post-link guide-section-link" href={`/explore/${section.id}`}>
      <EditorialPostCover id={section.id} title={section.title[locale]} locale={locale} />
      <ContentPostCopy category={category[locale]} title={section.title[locale]} />
    </Link>
  </ContentPostCard>;
}

function ExploreContent({ initialQuery, category, savedOnly, selectedTag, returnHref }: { initialQuery: string; category: string; savedOnly: boolean; selectedTag: string; returnHref: string }) {
  const { guides, loading, error, reload } = useEditorialCatalog();
  const router = useRouter();
  const state = useHomeState();
  const locale = state.locale;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const [query, setQuery] = useGuideSearchDraft(returnHref, initialQuery);
  const searchInput = useRef<HTMLInputElement>(null);
  const { catalog, savedFilter, beforeUnsave } = useGuideCatalogFocus();
  const stageGuideIds = state.profileSet ? recommended[state.stage] : [];
  const score = (guide: Pick<GuideSection, "id" | "category">, sectionId = guide.id) => {
    if (!state.profileSet) return 0;
    const rank = stageGuideIds.indexOf(sectionId);
    return (rank < 0 ? 0 : 3 - rank) + (state.interests.includes(guide.category) ? 3.5 : 0);
  };
  const rankedGuides = [...guides].sort((a, b) => score(b, b.sectionId) - score(a, a.sectionId));
  const normalizedQuery = normalizeGuideSearch(initialQuery);
  const showArticles = Boolean(normalizedQuery || savedOnly || selectedTag);
  const sections = [...guideSections].sort((a, b) => score(b) - score(a)).filter(section => category === "all" || section.category === category);
  const candidates = rankedGuides.filter(guide =>
    (category === "all" || guide.category === category) && (!savedOnly || state.saved.includes(guide.id)) &&
    normalizeGuideSearch([guide.title.zh, guide.title.ru, guide.summary.zh, guide.summary.ru, ...guide.keywords, ...(guide.tags ?? [])].join(" ")).includes(normalizedQuery)
  );
  const tagItems = collectTagCounts(candidates);
  const results = candidates.filter(guide => !selectedTag || guide.tags?.some(tag => tagKey(tag) === tagKey(selectedTag)));

  const navigate = (next: { q?: string; category?: string; saved?: boolean; tag?: string } = {}) => {
    const params = new URLSearchParams(returnHref.split("?")[1]);
    const q = (next.q ?? query).trim();
    const nextCategory = next.category ?? category;
    const nextTag = next.tag ?? selectedTag;
    if (q) params.set("q", q);
    else params.delete("q");
    if (nextCategory !== "all") params.set("category", nextCategory);
    else params.delete("category");
    if (next.saved ?? savedOnly) params.set("saved", "1");
    else params.delete("saved");
    if (nextTag) params.set("tag", nextTag);
    else params.delete("tag");
    router.push(`/explore${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  };
  const search = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); navigate(); };

  return <div ref={catalog} className="workspace-container explore-page">
    <div className="explore-intro">
      <div className="workspace-heading explore-heading-scene"><p className="workspace-eyebrow">{t("留学生活 · 从这里开始", "Студенческая жизнь · Начало пути")}</p><h1>{t("找到你的下一步。", "Найдите свой следующий шаг.")}</h1><p className="explore-heading-lead">{t("先了解流程，再确认要求。把需要的指南留在身边。", "Разберитесь в порядке действий, уточните требования и сохраните нужное.")}</p><GuidanceIllustration kind="search" className="explore-heading-companion" /></div>
      <Link href="/onboarding" className="explore-profile"><span>{state.profileSet ? t("我的情况", "Мой профиль") : t("让内容更适合你", "Настроить рекомендации")}</span><strong>{state.profileSet ? `${getSchool(state.university).shortLabel[locale]} · ${stageLabels[state.stage][locale]}` : t("选择学校与学习状态", "Выбрать вуз и свой этап")}</strong><span className="explore-profile-action">{state.profileSet ? t("修改情况", "Изменить профиль") : t("设置个人情况", "Настроить профиль")}<ArrowRight size={17} /></span></Link>
    </div>

    <section className="explore-search-panel creature-frame" aria-label={t("查找指南", "Поиск инструкций")}>
      <FrameCreature kind="frog" placement="top-left" />
      <form className="explore-search-form" role="search" onSubmit={search}>
        <label className="sr-only" htmlFor="explore-query">{t("搜索指南", "Поиск инструкций")}</label>
        <div className="explore-search-input"><Search size={22} aria-hidden="true" /><input ref={searchInput} id="explore-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("签证延期、居住登记……中俄文均可搜索", "Виза, регистрация… Поиск на русском и китайском")} />{query && <button type="button" className="icon-button" aria-label={t("清空搜索", "Очистить поиск")} onClick={() => { setQuery(""); searchInput.current?.focus({ preventScroll: true }); navigate({ q: "" }); }}><X size={18} /></button>}</div>
        <button className="button button-sticker" type="submit">{t("搜索", "Найти")}</button>
      </form>
      <div className="explore-categories" role="group" aria-label={t("指南分类", "Категории инструкций")}>
        <button className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => navigate({ category: "all" })}>{t("全部", "Все")}</button>
        {exploreCategories.map(item => <button key={item.id} className={category === item.id ? "is-active" : ""} aria-pressed={category === item.id} onClick={() => navigate({ category: item.id })}>{item[locale]}</button>)}
      </div>
      <TagFilter items={tagItems} selected={selectedTag} onSelect={tag => navigate({ tag })} />
    </section>

    <div className="explore-results-heading"><div><h2>{savedOnly ? t("已收藏的攻略", "Сохранённые статьи") : showArticles ? t("搜索结果", "Результаты поиска") : t("办事分区", "Разделы инструкций")}</h2>{!showArticles ? <p role="status">{t(`${sections.length} 个分区`, `Разделов: ${sections.length}`)}{state.profileSet && ` · ${state.interests.length ? t("按阶段与关注主题优先展示", "Сначала — по вашему этапу и темам") : t("按你的阶段优先展示", "Сначала — для вашего этапа")}`}</p> : !loading && !error && <p role="status">{t(`共 ${results.length} 篇攻略`, `Статей: ${results.length}`)}</p>}</div><button ref={savedFilter} className={`button secondary explore-saved-filter${savedOnly ? " is-active" : ""}`} aria-pressed={savedOnly} onClick={() => navigate({ saved: !savedOnly })}><Bookmark size={18} aria-hidden="true" />{t("只看收藏", "Только сохранённое")}</button></div>
    {state.profileSet && state.university !== "msu" && <p className="explore-scope-note">{t("当前展示通用参考；学校来源会单独标出，不代表适用于你的大学。", "Показаны общие рекомендации. Источники конкретного вуза отмечены отдельно и могут не подходить вашему университету.")}</p>}
    <GuideCatalogStatus loading={loading} error={error} onRetry={reload} />
    {!showArticles ? <div className="explore-grid">{sections.map(section => <SectionCard key={section.id} section={section} locale={locale} count={loading || error ? null : guides.filter(guide => guide.sectionId === section.id).length} />)}</div> : !loading && !error && (results.length ? <div className="explore-grid">{results.map(guide => <GuidePostCard key={guide.id} guide={guide} locale={locale} returnHref={returnHref} onUnsave={beforeUnsave} />)}</div> : <section className="explore-empty"><GuidanceIllustration kind={savedOnly ? "book" : "search"} animated={false} /><h2>{savedOnly ? t("这里暂时没有收藏", "Пока ничего не сохранено") : t("还没找到合适的结果", "Подходящих результатов пока нет")}</h2><p>{savedOnly ? t("收藏喜欢的攻略，或试试其他筛选。", "Сохраните нужные статьи или измените фильтры.") : t("换个关键词或标签，或浏览全部分区。", "Измените запрос или тег либо посмотрите все разделы.")}</p><button className="button button-sticker" onClick={() => { setQuery(""); searchInput.current?.focus({ preventScroll: true }); router.push("/explore", { scroll: false }); }}>{t("查看全部分区", "Все разделы")}</button></section>)}
  </div>;
}

export default function ExplorePage() {
  const params = useSearchParams();
  const category = params.get("category") ?? "all";
  const validCategory = exploreCategories.some(item => item.id === category) ? category : "all";
  let selectedTag = "";
  try { selectedTag = normalizeTag(params.get("tag") ?? ""); } catch { /* Ignore invalid URL tags without hiding the catalog. */ }
  const returnHref = `/explore${params.size ? `?${params.toString()}` : ""}`;
  return <ExploreContent initialQuery={params.get("q") ?? ""} category={validCategory} savedOnly={params.get("saved") === "1"} selectedTag={selectedTag} returnHref={returnHref} />;
}

export function ExploreLoading() {
  const { locale } = useHomeState();
  return <div className="workspace-container explore-loading" role="status"><span aria-hidden="true" /><p>{locale === "zh" ? "正在加载指南…" : "Загружаем инструкции…"}</p></div>;
}

