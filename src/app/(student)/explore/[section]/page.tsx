import { Suspense } from "react";
import { notFound } from "next/navigation";
import GuideSectionPage from "@/components/guide-section-page";
import { ExploreLoading } from "@/components/explore-page";
import { getGuideSection } from "@/data/guide-sections";
import "@/app/explore-flow.css";

export default async function GuideSectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section: id } = await params;
  const section = getGuideSection(id);
  if (!section) notFound();
  return <Suspense fallback={<ExploreLoading />}><GuideSectionPage section={section} /></Suspense>;
}
