"use client";

import { useState, useSyncExternalStore } from "react";
import { AccountCenter } from "@/components/account-center";
import { SocialLauncher } from "@/components/social-panel";
import { LanguageMenu } from "@/components/language-menu";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { ProfileIdentityCard } from "@/components/profile-identity-card";
import { PersonalTaskBoard } from "@/components/personal-task-board";
import { PersonalLibrary, type PersonalLibraryView } from "@/components/personal-library";
import { SketchSticker } from "@/components/campus-sketch";
import { useHomeState } from "@/lib/home-store";
import "@/app/explore-flow.css";

function subscribeToHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}
const readHash = () => window.location.hash;
const serverHash = () => "";

export function MySpace() {
  const state = useHomeState();
  const [accountRequested, setAccountRequested] = useState(false);
  const [libraryView, setLibraryView] = useState<PersonalLibraryView>("notes");
  const hash = useSyncExternalStore(subscribeToHash, readHash, serverHash);
  const { locale } = state;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  function closeAccount() {
    setAccountRequested(false);
    if (window.location.hash === "#account") {
      // Retain Next's history state and reading position when closing a deep link.
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }
  return <div className="workspace-container personal-space material-scene">
    <header className="workspace-heading personal-space-heading">
      <h1><span className="sketch-highlight">{t("我的空间", "Моё пространство")}<svg viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M3 8Q98 2 236 5M35 10Q129 6 216 9" /></svg></span></h1>
      <p>{t("按自己的节奏，把每一步变成进步。", "В своём темпе. Шаг за шагом вперёд.")}</p>
    </header>
    <div className="personal-space-grid">
      <aside className="personal-space-sidebar" aria-label={t("我的资料与收藏", "Мой профиль и сохранённое")}>
        <ProfileIdentityCard onOpenAccount={() => setAccountRequested(true)} />
        <section className="personal-social-entry material-glass" aria-labelledby="my-friends-title">
          <h2 id="my-friends-title">{t("我的好友", "Мои друзья")}</h2>
          <p>{t("添加同学，一起聊聊留学日常。", "Найдите однокурсников и общайтесь.")}</p>
          <SocialLauncher />
        </section>
        <nav className="personal-shortcuts material-glass" aria-label={t("我的内容", "Моя библиотека")}>
          <a href="#my-library" onClick={() => setLibraryView("notes")}><span className="personal-shortcut-sticker"><SketchSticker kind="book" /></span><span>{t("我的笔记", "Мои записи")}</span></a>
          <a href="#my-library" onClick={() => setLibraryView("guides")}><span className="personal-shortcut-sticker"><SketchSticker kind="book" /></span><span>{t("收藏的指南与攻略", "Инструкции и статьи")}</span></a>
          <a href="#my-library" onClick={() => setLibraryView("community")}><span className="personal-shortcut-sticker"><SketchSticker kind="chat" /></span><span>{t("社区收藏", "Из сообщества")}</span></a>
        </nav>
      </aside>
      <div className="personal-space-content">
        <PersonalTaskBoard />
      </div>
    </div>
    <PersonalLibrary view={libraryView} onViewChange={setLibraryView} />
    <WorkspaceDialog open={accountRequested || hash === "#account"} onClose={closeAccount} title={t("我的账号", "Мой аккаунт")} headerActions={<LanguageMenu tone="light" />}>
      <AccountCenter />
    </WorkspaceDialog>
  </div>;
}
