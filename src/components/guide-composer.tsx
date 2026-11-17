"use client";

import { useState } from "react";
import { EditorialEditor } from "@/components/editorial-editor";
import { createGuideDraft } from "@/data/guide-sections";
import type { EditorialDocument } from "@/data/editorial-content";
import { createEditorialGuide } from "@/lib/editorial-store";
import { useHomeState } from "@/lib/home-store";

export function GuideComposer({ sectionId, onCancel, onCreated }: {
  sectionId: string; onCancel: () => void; onCreated: (document: EditorialDocument) => void;
}) {
  const { locale } = useHomeState();
  const [draft] = useState(() => createGuideDraft(sectionId));
  return <div className="guide-reader"><div className="guide-reader-scroll">
    <EditorialEditor document={draft} locale={locale} creating onCancel={onCancel}
      onSave={async document => { onCreated(await createEditorialGuide(document)); }} />
  </div></div>;
}
