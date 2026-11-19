"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Bookmark, NotebookPen, PenLine, Trash2 } from "lucide-react";
import { CommunityPostCard } from "@/components/community-page";
import { useMemberSession } from "@/components/member-session";
import { useCommunityRemoteState } from "@/lib/community-remote-store";
import { CommunityComposer } from "@/components/community-composer";
import { GuideCatalogStatus, GuidePostCard } from "@/components/guide-post-card";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { LanguageMenu } from "@/components/language-menu";
import { useEditorialCatalog } from "@/lib/editorial-store";
import { deleteCommunityPost, getCommunityPosts, updateCommunityDraft, useCommunityState } from "@/lib/community-store";
import { useHomeState } from "@/lib/home-store";
import type { CommunityPost } from "@/data/community-content";
import "@/app/community.css";
import "@/app/personal-library.css";

export type PersonalLibraryView = "notes" | "guides" | "community";

export function PersonalLibrary({ view, onViewChange }: { view: PersonalLibraryView; onViewChange: (view: PersonalLibraryView) => void }) {
  const home = useHomeState();
  const state = useCommunityState();
  const { guides, loading, error, reload } = useEditorialCatalog();
  const { locale } = home;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const member = useMemberSession();
  const remote = useCommunityRemoteState();
  const ownIds = new Set(member.user && remote.activity?.viewerId === member.user.id ? remote.activity.ownIds : []);
  const published = remote.posts.filter(post => ownIds.has(post.id)).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const originals = state.posts.filter(post => !ownIds.has(post.id));
  const noteCount = published.length + originals.length;
  const savedGuides = guides.filter(guide => home.saved.includes(guide.id));
  const savedCommunity = getCommunityPosts(state).filter(post => state.saved.includes(post.id));
  const [editing, setEditing] = useState<CommunityPost | "new" | null>(null);
  const [deleting, setDeleting] = useState<CommunityPost | null>(null);
  const [feedback, setFeedback] = useState<"saved" | "deleted" | "failed" | null>(null);
  const results = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ trigger: HTMLButtonElement; selector: string; index: number } | null>(null);
  const schoolId = home.profileSet ? home.university : "msu";
  const tabs = [
    { id: "notes" as const, label: t("我的笔记", "Мои записи"), count: state.hydrated ? noteCount : null },
    { id: "guides" as const, label: t("收藏的指南与攻略", "Инструкции и статьи"), count: !loading && !error ? savedGuides.length : null },
    { id: "community" as const, label: t("社区收藏", "Из сообщества"), count: state.hydrated ? savedCommunity.length : null },
  ];
  useLayoutEffect(() => {
    const previous = pendingFocus.current;
    pendingFocus.current = null;
    if (!previous || previous.trigger.isConnected || document.activeElement !== document.body) return;
    const remaining = results.current?.querySelectorAll<HTMLButtonElement>(previous.selector);
    const target = remaining?.[Math.min(previous.index, remaining.length - 1)] ?? document.getElementById(`library-tab-${view}`);
    target?.focus({ preventScroll: true });
  });
  function beforeUnsave(trigger: HTMLButtonElement, selector: string) {
    if (document.activeElement !== trigger) return;
    pendingFocus.current = { trigger, selector, index: Array.from(results.current?.querySelectorAll(selector) ?? []).indexOf(trigger) };
  }
  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); onViewChange(tabs[next].id);
    document.getElementById(`library-tab-${tabs[next].id}`)?.focus();
  }
  function writeNote() {
    if (!state.draft.schoolId || (!state.draft.title.trim() && !state.draft.body.trim())) updateCommunityDraft({ schoolId });
    setFeedback(null); setEditing("new");
  }
  function removeNote() {
    if (!deleting) return;
    const ok = deleteCommunityPost(deleting.id);
    setDeleting(null); setFeedback(ok ? "deleted" : "failed");
    requestAnimationFrame(() => {
      const main = results.current?.closest(".workspace-page")?.querySelector("main");
      if (document.activeElement === document.body || document.activeElement === main) document.getElementById("library-tab-notes")?.focus({ preventScroll: true });
    });
  }
  return <section id="my-library" className="personal-library" aria-labelledby="my-library-title">
    <div className="personal-library-heading">
      <div><GuidanceIllustration kind="book" animated={false} /><h2 id="my-library-title">{t("我的内容", "Моя библиотека")}</h2></div>
      <button type="button" className="button primary button-sticker" disabled={!state.hydrated} onClick={writeNote}><PenLine size={20} aria-hidden="true" />{t("写笔记", "Написать")}</button>
    </div>
    <div className="personal-library-tabs material-switch" role="tablist" aria-label={t("我的笔记与收藏", "Мои записи и сохранённое")}>
      {tabs.map((tab, index) => <button key={tab.id} id={`library-tab-${tab.id}`} role="tab" type="button" aria-selected={view === tab.id} aria-controls="personal-library-results" tabIndex={view === tab.id ? 0 : -1} onClick={() => onViewChange(tab.id)} onKeyDown={event => changeTab(event, index)}><span>{tab.label}</span>{tab.count !== null && <span className="personal-shortcut-count">{tab.count}</span>}</button>)}
    </div>
    {feedback && <p className={`community-form-feedback${feedback === "failed" ? "" : " is-success"}`} role="status">{feedback === "failed" ? t("记录已变更，请刷新后重试。", "Запись изменилась. Обновите страницу и повторите.") : feedback === "deleted" ? t("原稿已删除。", "Оригинал удалён.") : state.storageUnavailable ? t("笔记已保留在本次浏览中。", "Запись оставлена в текущей сессии.") : t("笔记已保存。", "Запись сохранена.")}</p>}
    {state.storageUnavailable && <p className="community-storage-note" role="status">{t("浏览器存储暂不可用，笔记仅保留在本次浏览中。", "Хранилище браузера недоступно. Записи сохраняются только в текущей сессии.")}</p>}
    <div ref={results} id="personal-library-results" role="tabpanel" tabIndex={0} aria-labelledby={`library-tab-${view}`}>
      {view === "guides" ? <>
        <GuideCatalogStatus loading={loading} error={error} onRetry={reload} />
        {!loading && !error && (savedGuides.length ? <div className="personal-library-grid">{savedGuides.map(guide => <GuidePostCard key={guide.id} guide={guide} locale={locale} returnHref="/me" onUnsave={trigger => beforeUnsave(trigger, "[data-guide-save]")} />)}</div> : <div className="personal-library-empty material-glass material-glass--raised"><Bookmark size={32} aria-hidden="true" /><h3>{t("把有用的攻略留在这里", "Сохраните полезные статьи")}</h3><Link className="button secondary" href="/explore">{t("发现指南", "Найти инструкцию")}<ArrowUpRight size={18} aria-hidden="true" /></Link></div>)}
      </> : !state.hydrated ? <p role="status">{t("正在读取记录…", "Загружаем записи…")}</p> : view === "notes" ? noteCount ? <div className="personal-library-grid">{published.map(post => <CommunityPostCard key={post.id} post={post} locale={locale} shared linear={post.kind === "discussion"} />)}{originals.map(post => <CommunityPostCard key={post.id} post={post} locale={locale} localOriginal linear={post.kind === "discussion"} actions={<div className="personal-note-actions"><button type="button" className="text-button" onClick={() => { setFeedback(null); setEditing(post); }} aria-label={t(`编辑笔记：${post.title.zh}`, `Редактировать: ${post.title.ru}`)}><PenLine size={18} aria-hidden="true" />{t("编辑", "Изменить")}</button><button type="button" className="text-button" onClick={() => setDeleting(post)} aria-label={t(`删除笔记：${post.title.zh}`, `Удалить: ${post.title.ru}`)}><Trash2 size={18} aria-hidden="true" />{t("删除", "Удалить")}</button></div>} />)}</div> : <div className="personal-library-empty material-glass material-glass--raised"><NotebookPen size={32} aria-hidden="true" /><h3>{t("留下一段自己的校园日常", "Запишите историю своего дня")}</h3><button type="button" className="button secondary" onClick={writeNote}>{t("写第一篇笔记", "Создать первую запись")}</button></div> : savedCommunity.length ? <div className="personal-library-grid">{savedCommunity.map(post => <CommunityPostCard key={post.id} post={post} locale={locale} linear={post.kind === "discussion"} shared={state.sharedPosts.some(item => item.id === post.id)} onUnsave={trigger => beforeUnsave(trigger, "[data-community-save]")} />)}</div> : <div className="personal-library-empty material-glass material-glass--raised"><Bookmark size={32} aria-hidden="true" /><h3>{t("喜欢的笔记，收藏后在这里重逢", "Возвращайтесь к любимым историям")}</h3><Link className="button secondary" href="/community">{t("逛逛社区", "В сообщество")}<ArrowUpRight size={18} aria-hidden="true" /></Link></div>}
    </div>
    <WorkspaceDialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("写笔记", "Новая запись") : t("编辑笔记", "Редактировать запись")} headerActions={<LanguageMenu tone="light" />}>
      {editing && <CommunityComposer key={editing === "new" ? "new" : editing.id} schoolId={schoolId} post={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onViewChange("notes"); setFeedback("saved"); }} />}
    </WorkspaceDialog>
    <WorkspaceDialog open={deleting !== null} onClose={() => setDeleting(null)} title={t("删除笔记", "Удалить запись")}>
      <div className="personal-note-delete"><h3>{deleting?.title[locale]}</h3><p>{deleting && state.sharedPosts.some(item => item.id === deleting.id) ? t("删除原稿？已发布的内容会保留。", "Удалить оригинал? Опубликованная запись останется на сайте.") : t("删除这篇笔记及其评论？此操作无法撤销。", "Удалить эту запись и её комментарии? Это действие нельзя отменить.")}</p><div><button type="button" className="button secondary" onClick={() => setDeleting(null)}>{t("取消", "Отмена")}</button><button type="button" className="button primary" onClick={removeNote}>{t("确认删除", "Удалить")}</button></div></div>
    </WorkspaceDialog>
  </section>;
}
