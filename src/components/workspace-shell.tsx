"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MapPin, Menu, UserRound, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { PageAmbience } from "@/components/workspace-ambience";
import { LanguageMenu } from "@/components/language-menu";
import { GuideViewerProvider } from "@/components/guide-viewer-provider";
import { useHomeState } from "@/lib/home-store";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { locale, storageUnavailable } = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { document.documentElement.lang = locale === "zh" ? "zh-CN" : "ru"; }, [locale]);
  const navigation = [
    { href: "/", title: t("首页", "Главная") },
    { href: "/dashboard", title: t("留学生活", "Студенческая жизнь") },
    { href: "/explore", title: t("办事指南", "Инструкции") },
    { href: "/community", title: t("留学社区", "Сообщество") },
  ];
  const links = navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : item.href === "/community" && pathname.startsWith("/community/") || item.href === "/explore" && (pathname.startsWith("/guides/") || pathname.startsWith("/explore/")) ? "location" : undefined} onClick={() => setMenuOpen(false)}>{item.title}</Link>);
  const mapLink = <Link className="workspace-map-link" href="/dashboard#city-map" onClick={() => setMenuOpen(false)}>{t("地图", "Карта")}<MapPin size={16} strokeWidth={1.75} aria-hidden="true" /></Link>;
  return <div id="top" className={`site spatial-page workspace-page locale-${locale}`} onKeyDown={event => {
    if (event.key === "Escape" && menuOpen) { setMenuOpen(false); menuToggle.current?.focus(); }
  }}>
    <GuideViewerProvider key={pathname}>
    <PageAmbience />
    <a className="skip-link" href="#main">{t("跳到主要内容", "Перейти к содержимому")}</a>
    <header className="site-header workspace-header">
      <div className="header-inner">
        <Brand href="/" />
        <nav className="workspace-nav" aria-label={t("主导航", "Основная навигация")}>{links}{mapLink}</nav>
        <div className="workspace-header-actions">
          <div className="glass-select glass-select--icon header-account" data-tone="dark"><Link href="/me" className="glass-select-trigger header-account-link" aria-label={t("我的", "Мой аккаунт")} title={t("我的", "Мой аккаунт")} aria-current={pathname === "/me" ? "page" : pathname === "/onboarding" ? "location" : undefined} onClick={() => setMenuOpen(false)}><UserRound size={22} strokeWidth={1.75} aria-hidden="true" /></Link></div>
          <LanguageMenu />
          <button ref={menuToggle} className="icon-button workspace-menu-toggle" aria-expanded={menuOpen} aria-controls="workspace-menu" aria-label={menuOpen ? t("关闭导航", "Закрыть меню") : t("打开导航", "Открыть меню")} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      <nav id="workspace-menu" className="workspace-mobile-nav" hidden={!menuOpen} aria-label={t("移动导航", "Мобильная навигация")}>{links}{mapLink}</nav>
    </header>
    <main id="main" className="workspace-main" tabIndex={-1}>
      {storageUnavailable && <p className="workspace-storage workspace-container" role="status">{t("浏览器无法保存记录，本次选择仅在当前页面会话中保留。", "Браузер не может сохранить данные. Выбор останется только в текущем сеансе.")}</p>}
      {children}
    </main>
    <footer className="workspace-footer workspace-container"><Brand href="/" /></footer>
    </GuideViewerProvider>
  </div>;
}
