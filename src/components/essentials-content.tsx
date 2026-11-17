"use client";

import { EditorialPostReader } from "@/components/guide-reader";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { LanguageMenu } from "@/components/language-menu";
import { useHomeState } from "@/lib/home-store";

export function EssentialsContent({ onOpenPersonal }: { onOpenPersonal?: () => void }) {
  return <EditorialPostReader documentId="essentials" onOpenPersonal={onOpenPersonal} />;
}

export function EssentialsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useHomeState();
  return <WorkspaceDialog open={open} onClose={onClose} variant="essentials" headerActions={<LanguageMenu tone="light" />} title={locale === "zh" ? "入学必看" : "С чего начать"}><EssentialsContent onOpenPersonal={onClose} /></WorkspaceDialog>;
}
