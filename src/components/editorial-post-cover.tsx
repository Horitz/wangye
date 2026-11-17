import { Sparkles } from "lucide-react";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import type { Locale } from "@/lib/home-store";

const themes = {
  "visa-extension": { color: "lilac", art: "pencil" },
  "residence-registration": { color: "teal", art: "plan" },
  "medical-examination": { color: "pink", art: "book" },
  "bank-card": { color: "yellow", art: "pencil" },
  "university-admission": { color: "lilac", art: "book" },
  "first-week": { color: "teal", art: "route" },
  "public-transport": { color: "yellow", art: "route" },
  housing: { color: "pink", art: "plan" },
  essentials: { color: "lilac", art: "book" },
} as const;

export function EditorialPostCover({ id, title, locale, src, imageCount = 0 }: { id: string; title: string; locale: Locale; src?: string; imageCount?: number }) {
  const theme = themes[id as keyof typeof themes] ?? themes.essentials;
  return <div className={`editorial-post-cover editorial-post-cover--${theme.color}${src ? " editorial-post-cover--photo" : ""}`} aria-hidden="true">
    {src ? <>
      {/* The public cover endpoint serves the administrator's saved JPEG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" decoding="async" />
      {imageCount > 1 && <span className="editorial-post-image-count material-glass">1 / {imageCount}</span>}
    </> : <><span className="editorial-post-brand">StudentPath</span><strong className="editorial-post-cover-title">{title}</strong><GuidanceIllustration kind={theme.art} animated={false} className="editorial-post-art" /><span className="editorial-post-cover-foot"><Sparkles size={16} />{locale === "zh" ? "留学生活手记" : "Заметки о студенческой жизни"}</span></>}
  </div>;
}
