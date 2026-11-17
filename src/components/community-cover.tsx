import { MapPin, Sparkles } from "lucide-react";
import { ClayStudent } from "@/components/clay-student";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import type { CommunityPost } from "@/data/community-content";
import type { Locale } from "@/lib/home-store";
import { getSchool } from "@/data/school-options";

const coverCopy = {
  campus: { zh: ["校园里的", "小小日常"], ru: ["Жизнь", "в кампусе"] },
  daily: { zh: ["把日子", "过成喜欢的样子"], ru: ["Маленькие", "радости дня"] },
  arrival: { zh: ["你好，", "新生活。"], ru: ["Привет,", "новая жизнь."] },
};

/** Original decorative cover. The actual post title is always readable outside it. */
export function CommunityCover({ post, locale }: { post: CommunityPost; locale: Locale }) {
  const photo = post.images?.[0];
  if (photo) return <div className="community-cover community-cover--photo" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.src} width={photo.width} height={photo.height} alt="" loading="lazy" decoding="async" />
  </div>;
  const lines = coverCopy[post.topic][locale];
  const portrait = post.topic === "arrival";
  return <div className={`community-cover community-cover--${post.cover ?? "lilac"}${portrait ? " community-cover--portrait" : ` community-cover--illustrated community-cover--${post.topic === "campus" ? "sketch" : "pixel"}`}`} aria-hidden="true">
    <span className="community-cover-brand">StudentPath</span>
    <div className="community-cover-copy"><span>{lines[0]}</span><strong>{lines[1]}</strong></div>
    {portrait ? <div className="community-cover-student"><ClayStudent variant="beanie" /></div> : <GuidanceIllustration kind={post.topic === "campus" ? "book" : "coffee"} animated={false} className="community-cover-art" />}
    {portrait && <Sparkles className="community-cover-spark" size={24} strokeWidth={1.75} />}
    <span className="community-cover-stamp"><MapPin size={16} strokeWidth={1.75} />{getSchool(post.schoolId).shortLabel[locale]}</span>
  </div>;
}
