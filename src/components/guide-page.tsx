"use client";

import { useRouter } from "next/navigation";
import GuideSectionPage from "@/components/guide-section-page";
import { GuideViewerProvider } from "@/components/guide-viewer-provider";
import type { GuideSection } from "@/data/guide-sections";

export default function GuidePage({ guideId, section, returnHref }: { guideId: string; section: GuideSection; returnHref: string }) {
  const router = useRouter();
  return <GuideViewerProvider key={guideId} initialGuideId={guideId} onDismiss={() => router.replace(returnHref)}>
    <GuideSectionPage section={section} />
  </GuideViewerProvider>;
}
