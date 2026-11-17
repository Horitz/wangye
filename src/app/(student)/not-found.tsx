"use client";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { useHomeState } from "@/lib/home-store";

export default function NotFound() {
  const { locale } = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <section className="workspace-container workspace-not-found workspace-heading"><Compass size={48} strokeWidth={1.75} /><span className="workspace-eyebrow">404</span><h1>{t("这条路线还没有收录。", "Такой страницы пока нет.")}</h1><p>{t("链接可能有误，回到指南列表继续找找吧。", "Возможно, в ссылке ошибка. Вернитесь к списку инструкций.")}</p><Link className="button primary" href="/explore"><ArrowLeft size={18} />{t("返回办事指南", "К списку инструкций")}</Link></section>;
}
