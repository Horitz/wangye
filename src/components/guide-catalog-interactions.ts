"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** URL navigation replaces the search draft; unrelated renders keep it intact. */
export function useGuideSearchDraft(returnHref: string, initialQuery: string) {
  const [draft, setDraft] = useState({ returnHref, query: initialQuery });
  if (draft.returnHref !== returnHref) {
    setDraft({ returnHref, query: initialQuery });
  }
  return [draft.query, (query: string) => setDraft({ returnHref, query })] as const;
}

/** Keep keyboard users in the results after a saved-only card is removed. */
export function useGuideCatalogFocus() {
  const catalog = useRef<HTMLDivElement>(null);
  const savedFilter = useRef<HTMLButtonElement>(null);
  const pending = useRef<{ trigger: HTMLButtonElement; index: number } | null>(null);

  useLayoutEffect(() => {
    const previous = pending.current;
    pending.current = null;
    if (!previous || previous.trigger.isConnected || !catalog.current?.isConnected
      || document.activeElement !== document.body) return;
    const remaining = catalog.current.querySelectorAll<HTMLButtonElement>("[data-guide-save]");
    const target = remaining[Math.min(previous.index, remaining.length - 1)] ?? savedFilter.current;
    target?.focus({ preventScroll: true });
  });

  function beforeUnsave(trigger: HTMLButtonElement) {
    if (document.activeElement !== trigger) return;
    const buttons = Array.from(catalog.current?.querySelectorAll<HTMLButtonElement>("[data-guide-save]") ?? []);
    pending.current = { trigger, index: buttons.indexOf(trigger) };
  }

  return { catalog, savedFilter, beforeUnsave };
}
