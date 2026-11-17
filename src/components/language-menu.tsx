"use client";

import { Globe2 } from "lucide-react";
import { GlassSelect } from "@/components/glass-select";
import { updateHome, useHomeState } from "@/lib/home-store";

/** The same globe menu is used by public and student-facing navigation. */
export function LanguageMenu({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const { locale } = useHomeState();
  return <GlassSelect
    value={locale}
    onChange={value => { if (value === "zh" || value === "ru") updateHome({ locale: value }); }}
    options={[
      { value: "zh", label: "中文", lang: "zh-CN" },
      { value: "ru", label: "Русский", lang: "ru" },
    ]}
    ariaLabel={locale === "zh" ? "切换语言" : "Выбрать язык"}
    icon={<Globe2 size={22} strokeWidth={1.75} />}
    iconOnly
    align="end"
    tone={tone}
    className="language-menu"
  />;
}
