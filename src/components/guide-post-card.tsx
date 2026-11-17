"use client";

import { Bookmark, FileCheck2, GraduationCap, HeartPulse, House, TrainFront, WalletCards } from "lucide-react";
import { ContentPostCard, ContentPostCopy, PostByline } from "@/components/content-post";
import { EditorialPostCover } from "@/components/editorial-post-cover";
import { ContentTags } from "@/components/content-tags";
import { GuideLink } from "@/components/guide-viewer-provider";
import type { EditorialGuidePreview } from "@/lib/editorial-store";
import { toggleSaved, useHomeState, type Locale } from "@/lib/home-store";

export const exploreCategories = [
  { id: "documents", icon: FileCheck2, zh: "证件与签证", ru: "Документы и виза" },
  { id: "study", icon: GraduationCap, zh: "入学与学习", ru: "Поступление и учёба" },
  { id: "health", icon: HeartPulse, zh: "医疗与保险", ru: "Медицина и страховка" },
  { id: "banking", icon: WalletCards, zh: "银行与支付", ru: "Банки и платежи" },
  { id: "living", icon: House, zh: "住宿与生活", ru: "Проживание и быт" },
  { id: "transport", icon: TrainFront, zh: "交通与城市", ru: "Транспорт и город" },
] as const;

export const normalizeGuideSearch = (text: string) => text.toLocaleLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();

export function GuidePostCard({ guide, locale, returnHref, onUnsave }: { guide: EditorialGuidePreview; locale: Locale; returnHref: string; onUnsave?: (trigger: HTMLButtonElement) => void }) {
  const state = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const category = exploreCategories.find(item => item.id === guide.category)!;
  const saved = state.saved.includes(guide.id);
  return <ContentPostCard className="editorial-post-card" footer={<div className="editorial-post-footer">
    <PostByline name={guide.author.name[locale]} />
    <button className="editorial-post-save" data-guide-save type="button" onClick={event => { if (saved) onUnsave?.(event.currentTarget); toggleSaved(guide.id); }} aria-pressed={saved}
      aria-label={`${saved ? t("取消收藏", "Убрать из сохранённого") : t("收藏", "Сохранить")}: ${guide.title[locale]}`}><Bookmark size={19} fill={saved ? "currentColor" : "none"} aria-hidden="true" /><span>{saved ? t("已收藏", "Сохранено") : t("收藏", "Сохранить")}</span></button>
  </div>}>
    <GuideLink className="content-post-link" guideId={guide.id} returnHref={returnHref}>
      <EditorialPostCover id={guide.sectionId} title={guide.title[locale]} locale={locale} src={guide.coverUrl} imageCount={guide.imageCount} />
      <ContentPostCopy category={category[locale]} title={guide.title[locale]} />
    </GuideLink>
    <ContentTags tags={guide.tags} hrefForTag={tag => `/explore/${guide.sectionId}?tag=${encodeURIComponent(tag)}`} />
  </ContentPostCard>;
}

export function GuideCatalogStatus({ loading, error, onRetry }: { loading: boolean; error: boolean; onRetry: () => void }) {
  const { locale } = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  if (loading) return <p className="guide-catalog-status" role="status">{t("正在加载攻略…", "Загружаем статьи…")}</p>;
  if (error) return <div className="guide-catalog-status guide-catalog-status--error" role="alert"><p>{t("暂时无法读取攻略。", "Не удалось загрузить статьи.")}</p><button className="button secondary" type="button" onClick={onRetry}>{t("重新加载", "Повторить")}</button></div>;
  return null;
}
