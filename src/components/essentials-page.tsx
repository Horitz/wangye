"use client";

import { EssentialsContent } from "@/components/essentials-content";
import { useHomeState } from "@/lib/home-store";

export function EssentialsPage() {
  const { locale } = useHomeState();
  return <div className="workspace-container essentials-page essentials-standalone"><header className="workspace-heading"><h1>{locale === "zh" ? "入学必看" : "С чего начать"}</h1></header><EssentialsContent /></div>;
}
