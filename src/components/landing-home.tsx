"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, UserRound, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { SpatialHome } from "@/components/home-spatial";
import { useSkyPlayback } from "@/components/landing-starfield";
import { PageAmbience } from "@/components/workspace-ambience";
import { LanguageMenu } from "@/components/language-menu";
import { useHomeState } from "@/lib/home-store";
import { useMemberSession } from "@/components/member-session";

/** Public presentation page; student tools live on separate routes. */
export default function LandingHome() {
  const { locale, storageUnavailable } = useHomeState();
  const member = useMemberSession();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const menuToggle = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  useSkyPlayback(main);

  useEffect(() => { document.documentElement.lang = locale === "zh" ? "zh-CN" : "ru"; }, [locale]);

  return (
    <div id="top" className={`site landing-page spatial-page locale-${locale}`} onKeyDown={event => {
      if (event.key !== "Escape") return;
      if (menuOpen) { setMenuOpen(false); menuToggle.current?.focus(); }
    }}>
      <PageAmbience />
      <a className="skip-link" href="#main">{t("跳到主要内容", "Перейти к содержимому")}</a>
      <header className="site-header landing-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav landing-nav" aria-label={t("主导航", "Основная навигация")}>
            <a href="#about">{t("探索 StudentPath", "О StudentPath")}</a>
            <a href="#start">{t("开启旅程", "Начало пути")}</a>
          </nav>
          <div className="header-actions landing-actions">
            <div className="glass-select glass-select--icon header-account" data-tone="dark"><Link href="/me" className="glass-select-trigger header-account-link" aria-label={t("我的", "Мой аккаунт")} title={t("我的", "Мой аккаунт")} onClick={() => setMenuOpen(false)}><UserRound size={22} strokeWidth={1.75} aria-hidden="true" /></Link></div>
            <LanguageMenu />
            <button ref={menuToggle} className="icon-button mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="mobile-navigation"
              aria-label={menuOpen ? t("关闭导航", "Закрыть меню") : t("打开导航", "Открыть меню")}
              onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
        <nav id="mobile-navigation" className="mobile-nav landing-menu" hidden={!menuOpen} aria-label={t("移动导航", "Мобильная навигация")}>
          <a href="#about" onClick={() => setMenuOpen(false)}>{t("探索 StudentPath", "О StudentPath")}</a>
          <a href="#start" onClick={() => setMenuOpen(false)}>{t("开启旅程", "Начало пути")}</a>
        </nav>
      </header>
      <main id="main" ref={main}>
        {storageUnavailable && <p className="storage-notice page-container" role="status">{t("语言设置仅在本次浏览中保留。", "Выбранный язык сохранится только до закрытия страницы.")}</p>}
        <SpatialHome locale={locale} onStart={() => router.push(member.user && member.profile ? "/dashboard" : "/onboarding")} />
      </main>
      <footer className="site-footer landing-footer spatial-footer">
        <div className="footer-inner page-container">
          <Brand light />
        </div>
      </footer>
    </div>
  );
}
