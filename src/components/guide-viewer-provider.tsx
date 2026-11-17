"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { EditorialPostReader } from "@/components/guide-reader";
import { LanguageMenu } from "@/components/language-menu";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { guidePreviews } from "@/data/home-content";
import { isCustomGuideId } from "@/data/guide-sections";
import { useEditorialGuides } from "@/lib/editorial-store";
import { useHomeState } from "@/lib/home-store";

const GuideViewerContext = createContext<((guideId: string) => void) | null>(null);

export function GuideViewerProvider({ children, initialGuideId = null, onDismiss }: { children: ReactNode; initialGuideId?: string | null; onDismiss?: () => void }) {
  const [guideId, setGuideId] = useState<string | null>(initialGuideId);
  const previousGuideId = useRef<string | null>(null);
  const dialogAnchor = useRef<HTMLSpanElement>(null);
  const { locale } = useHomeState();
  const catalog = useEditorialGuides();
  const guide = catalog.find(item => item.id === guideId);
  const openGuide = useCallback((id: string) => {
    if (isCustomGuideId(id) || guidePreviews.some(item => item.id === id)) setGuideId(id);
  }, []);
  useEffect(() => {
    const previous = previousGuideId.current;
    previousGuideId.current = guideId;
    if (previous === null || guideId === null || previous === guideId) return;
    // Replacing the reader removes its next-guide link, so move focus to the new article.
    dialogAnchor.current?.closest("dialog[open]")?.querySelector<HTMLElement>('.guide-reader-article-panel')?.focus({ preventScroll: true });
  }, [guideId]);

  return <GuideViewerContext.Provider value={openGuide}>
    {children}
    <WorkspaceDialog
      open={Boolean(guideId)}
      onClose={() => { setGuideId(null); onDismiss?.(); }}
      title={guide?.title[locale] ?? (locale === "zh" ? "办事指南" : "Инструкция")}
      variant="guide"
      headerActions={<LanguageMenu tone="light" />}
    >
      <span ref={dialogAnchor} hidden />
      {guideId && <EditorialPostReader key={guideId} documentId={guideId} guide={guide} onGuideChange={openGuide} onOpenPersonal={() => setGuideId(null)} />}
    </WorkspaceDialog>
  </GuideViewerContext.Provider>;
}

export function GuideLink({ guideId, returnHref = "/explore", children, className }: {
  guideId: string;
  returnHref?: string;
  children: ReactNode;
  className?: string;
}) {
  const openGuide = useContext(GuideViewerContext);
  const canOpen = Boolean(openGuide && (isCustomGuideId(guideId) || guidePreviews.some(guide => guide.id === guideId)));

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!canOpen || !openGuide || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // The native top layer keeps an existing preparation dialog inert underneath.
    // It stays mounted so closing this guide restores the same tab and reading position.
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    openGuide(guideId);
  }

  return <Link
    href={{ pathname: `/guides/${guideId}`, query: { from: returnHref } }}
    className={className}
    aria-haspopup={canOpen ? "dialog" : undefined}
    onClick={handleClick}
  >{children}</Link>;
}
