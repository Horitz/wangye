import { notFound } from "next/navigation";
import GuidePage from "@/components/guide-page";
import { getGuideSection, isCustomGuideId } from "@/data/guide-sections";
import { guidePreviews } from "@/data/home-content";
import { openSiteAdminStore } from "@/lib/server/site-store.mjs";
import "@/app/explore-flow.css";

export const dynamic = "force-dynamic";

export default async function GuideRoute({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string | string[] }> }) {
  const { slug } = await params;
  const builtInGuide = guidePreviews.find(guide => guide.id === slug);
  let section = builtInGuide ? getGuideSection(builtInGuide.id) : undefined;
  if (!section && isCustomGuideId(slug)) {
    const store = await openSiteAdminStore();
    try {
      const document = await store.readEditorialCover(slug);
      if (document?.id === slug && typeof document.sectionId === "string") section = getGuideSection(document.sectionId);
    } finally { store.close(); }
  }
  if (!section) notFound();
  const { from } = await searchParams;
  const fromPath = typeof from === "string" ? from.split("?")[0] : "";
  const allowedReturn = ["/me", "/essentials", "/explore"].includes(fromPath) || (fromPath.startsWith("/explore/") && Boolean(getGuideSection(fromPath.slice(9))));
  const returnHref = typeof from === "string" && from.length <= 4000 && allowedReturn ? from : `/explore/${section.id}`;
  return <GuidePage guideId={slug} section={section} returnHref={returnHref} />;
}
