import { ClipboardList, ExternalLink, FolderOpen, MapPin } from "lucide-react";
import { PublishedGuideGallery } from "@/components/published-guide-gallery";
import type { EditorialStep } from "@/data/editorial-content";
import type { Locale } from "@/lib/home-store";
import { getTwoGisSearchUrl } from "@/lib/map-links";
import "@/app/published-step-details.css";

/** Shared published information, with no personal editing or completion controls. */
export function PublishedStepDetails({ step, locale, showDescription = true }: {
  step: EditorialStep;
  locale: Locale;
  showDescription?: boolean;
}) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const materials = step.materials.filter(material => material[locale].trim());
  const place = step.place?.[locale];
  const address = step.address?.[locale];
  const mapQuery = step.address?.ru?.trim() || address?.trim() || step.place?.ru?.trim() || place?.trim();
  const requirements = step.requirements?.[locale];
  return <div className="published-step-details">
    {showDescription && step.description[locale] && <p className="published-step-description">{step.description[locale]}</p>}
    {(materials.length > 0 || step.images.length > 0) && <section className="published-step-materials">
      <h4><FolderOpen size={20} aria-hidden="true" />{materials.length ? t("所需材料", "Документы") : t("配图", "Фотографии")}</h4>
      {materials.length > 0 && <ul>{materials.map((material, index) => <li key={index}>{material[locale]}</li>)}</ul>}
      <PublishedGuideGallery images={step.images} locale={locale} variant="materials" />
    </section>}
    {(place || address) && <section className="published-step-location">
      <h4><MapPin size={20} aria-hidden="true" />{t("地点与地址", "Место и адрес")}</h4>
      <dl>
        {place && <div><dt>{t("地点", "Место")}</dt><dd>{place}</dd></div>}
        {address && <div><dt>{t("地址", "Адрес")}</dt><dd>{address}</dd></div>}
      </dl>
      {mapQuery && <a className="button secondary published-step-map-link" href={getTwoGisSearchUrl(mapQuery)} target="_blank" rel="noopener noreferrer" aria-label={t("在 2GIS 查看（在新标签页打开）", "Открыть в 2ГИС (в новой вкладке)")}><span>{t("在 2GIS 查看", "Открыть в 2ГИС")}</span><ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" /></a>}
    </section>}
    {requirements && <section className="published-step-requirements"><h4><ClipboardList size={20} aria-hidden="true" />{t("办理要求", "Условия оформления")}</h4><p>{requirements}</p></section>}
    {step.sources.length > 0 && <div className="published-step-sources">{step.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer"><span>{source.label[locale] || source.url}</span><ExternalLink size={16} aria-hidden="true" /></a>)}</div>}
  </div>;
}
