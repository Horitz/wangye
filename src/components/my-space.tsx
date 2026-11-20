"use client";

import { useState, useSyncExternalStore } from "react";
import { useMemberSession } from "@/components/member-session";
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
const isAccountHash = (hash: string) => hash === "#account" || hash === "#admin";

export function MySpace() {
  const state = useHomeState();
  const member = useMemberSession();
  const owner = member.user?.id ?? "guest";
  const [accountRequested, setAccountRequested] = useState<"member" | "admin" | null>(null);
  const [libraryView, setLibraryView] = useState<PersonalLibraryView>("notes");
  const hash = useSyncExternalStore(subscribeToHash, readHash, serverHash);
  const accountMode = hash === "#admin" ? "admin" : hash === "#account" ? "member" : accountRequested;
  const { locale } = state;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  function changeAccountMode(mode: "member" | "admin" | null) {
    if (!isAccountHash(window.location.hash)) {
      setAccountRequested(mode);
      return;
    }
    setAccountRequested(null);
    const nextHash = mode === "admin" ? "#admin" : mode === "member" ? "#account" : "";
    // Retain Next's history state and reading position when changing a deep link.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  return <div className="workspace-container personal-space material-scene">
    <header className="workspace-heading personal-space-heading">
      <h1><span className="sketch-highlight">{t("我的空间", "Моё пространство")}<svg viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M3 8Q98 2 236 5M35 10Q129 6 216 9" /></svg></span></h1>
      <p>{t("按自己的节奏，把每一步变成进步。", "В своём темпе. Шаг за шагом вперёд.")}</p>
    </header>
    <div className="personal-space-grid">
      <aside className="personal-space-sidebar" aria-label={t("我的资料与收藏", "Мой профиль и сохранённое")}>
        <ProfileIdentityCard onOpenAccount={() => changeAccountMode("member")} />
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
        {member.user ? <PersonalTaskBoard key={owner} /> : <section className="personal-task-list-card material-glass material-glass--raised">
          <h2>{t("我的清单与日期", "Мои дела и даты")}</h2>
          {member.loaded && <button type="button" className="button secondary" onClick={() => changeAccountMode("member")}>{t("登录查看我的待办", "Войти и открыть мои дела")}</button>}
        </section>}
      </div>
    </div>
    <PersonalLibrary key={owner} view={libraryView} onViewChange={setLibraryView} />
    <WorkspaceDialog open={accountMode !== null} onClose={() => changeAccountMode(null)} title={accountMode === "admin" ? t("站点管理", "Управление сайтом") : t("我的账号", "Мой аккаунт")} headerActions={<LanguageMenu tone="light" />}>
      <AccountCenter mode={accountMode ?? "member"} onModeChange={changeAccountMode} />
    </WorkspaceDialog>
  </div>;
}
