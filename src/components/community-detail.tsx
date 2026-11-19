"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, PenLine, Send, Trash2 } from "lucide-react";
import { CommunityCover } from "@/components/community-cover";
import { PublishedGuideGallery } from "@/components/published-guide-gallery";
import { ContentTags } from "@/components/content-tags";
import { CommunityActions, CommunityFeatureManagement, CommunityRemoteNotice, communityTagHref, communityTopics } from "@/components/community-page";
import { addCommunityComment, deleteCommunityComment, deleteCommunityPost, getCommunityPosts, useCommunityState } from "@/lib/community-store";
import { useHomeState } from "@/lib/home-store";
import { SocialLauncher } from "@/components/social-panel";
import { PublicComments } from "@/components/public-comments";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { LanguageMenu } from "@/components/language-menu";
import { CommunityComposer } from "@/components/community-composer";
import { PublishedCommunityEditor } from "@/components/published-community-editor";
import type { CommunityPost } from "@/data/community-content";
import "@/app/account-center.css";
import { getSchool } from "@/data/school-options";
import { refreshCommunityRemote, updateRemoteCommunityPost, useCommunityRemoteState } from "@/lib/community-remote-store";

export function CommunityDetail({ id }: { id: string }) {
  const { locale } = useHomeState();
  const state = useCommunityState();
  const remote = useCommunityRemoteState();
  const router = useRouter();
  const params = useSearchParams();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<"empty" | "saved" | "failed" | "deleted" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: "published" | "original"; post: CommunityPost } | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editFeedback, setEditFeedback] = useState<"published" | "original" | null>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);
  const localOriginal = params.get("local") === "1" ? state.posts.find(item => item.id === id) : undefined;
  const post = localOriginal ?? getCommunityPosts(state).find(item => item.id === id);
  const hasSharedCopy = state.sharedPosts.some(item => item.id === id);
  const isShared = !localOriginal && hasSharedCopy;
  const ownsLocalPost = state.posts.some(item => item.id === id);
  const publishedPost = remote.posts.find(item => item.id === id && !item.demo);
  const canEditPublished = !localOriginal && publishedPost && remote.session?.authenticated;

  if (!state.hydrated) return <div className="workspace-container community-page"><p className="community-empty" role="status">{t("正在加载…", "Загружаем…")}</p></div>;
  if (!post && (remote.status === "idle" || remote.status === "loading")) return <div className="workspace-container community-page"><p className="community-empty" role="status">{t("正在加载…", "Загружаем…")}</p></div>;
  if (!post && remote.status === "error") return <div className="workspace-container workspace-not-found workspace-heading"><h1>{t("暂时无法读取这篇内容", "Не удалось загрузить запись")}</h1><p>{t("连接失败，请重试。", "Нет соединения. Повторите попытку.")}</p><button type="button" className="button primary" onClick={() => void refreshCommunityRemote()}>{t("重试", "Повторить")}</button><Link href="/community" className="text-button">{t("返回社区", "В сообщество")}</Link></div>;
  if (!post) return <div className="workspace-container workspace-not-found workspace-heading"><MessageCircle size={40} strokeWidth={1.75} aria-hidden="true" /><h1>{t("这里还没有这篇内容", "Эта запись не найдена")}</h1><Link href="/community" className="button primary">{t("返回社区", "Вернуться в сообщество")}</Link></div>;

  const comments = state.comments[id] ?? [];
  const publicThread = !localOriginal && (post.demo || isShared || Boolean(publishedPost));
  const LocalThread = publicThread ? "details" : "section";
  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim()) { setFeedback("empty"); commentInput.current?.focus(); return; }
    if (addCommunityComment(id, comment)) { setComment(""); setFeedback("saved"); }
    else setFeedback("failed");
  };
  const cancelDelete = () => {
    const triggerId = `community-delete-${confirmDelete}`;
    setConfirmDelete(null);
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  };

  return <div className="workspace-container community-page community-detail-page">
    <div className="community-detail-topbar"><Link href={localOriginal ? "/me#my-library" : `/community?school=${post.schoolId}`} className="workspace-back"><ArrowLeft size={20} strokeWidth={1.75} />{localOriginal ? t("返回我的笔记", "К моим заметкам") : `${t("返回社区", "В сообщество")} · ${getSchool(post.schoolId).shortLabel[locale]}`}</Link><SocialLauncher /></div>
    <CommunityRemoteNotice locale={locale} />
    {state.storageUnavailable && <p className="community-storage-note" role="status">{t("暂时无法保存，关闭或刷新后可能丢失记录。", "Не удалось сохранить записи. После обновления или закрытия страницы они могут исчезнуть.")}</p>}
    <article className={`workspace-panel community-detail${post.images?.length ? " community-detail--photos" : post.kind === "note" ? " community-detail--note" : ""}`}>
      {post.images?.length ? <div className="community-photo-gallery"><PublishedGuideGallery key={post.id} images={post.images.map(photo => ({ ...photo, caption: photo.caption[locale] }))} locale={locale} label={t("帖子图片", "Фотографии записи")} /></div> : post.kind === "note" && <div className="community-detail-cover"><CommunityCover post={post} locale={locale} /></div>}
      <div className="community-detail-content">
        <p className="community-author"><span className="community-avatar" aria-hidden="true">{post.demo || isShared ? "S" : t("我", "Я")}</span>{post.author?.[locale] ?? (post.demo ? "StudentPath" : isShared ? t("未署名", "Без подписи") : t("我", "Я"))}</p>
        <span className="community-topic">{getSchool(post.schoolId).label[locale]} · {communityTopics[post.topic][locale]} · {post.kind === "note" ? t("生活笔记", "Заметка") : t("讨论", "Обсуждение")}</span>
        <h1>{post.title[locale]}</h1>
        {Boolean(post.tags?.length) && <div className="community-detail-tags"><ContentTags tags={post.tags} hrefForTag={tag => communityTagHref(post, tag)} /></div>}
        <div className="community-post-body">{post.body[locale].split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        {(post.sources?.length || post.images?.some(photo => photo.credit)) ? <details className="community-post-references"><summary>{t("相关信息与图片", "Материалы и фотографии")}</summary><div>
          {post.sources?.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label[locale]}</a>)}
          {post.images?.map((photo, index) => photo.credit && <p key={photo.id}>{t(`图 ${index + 1}`, `Фото ${index + 1}`)} · <a href={photo.credit.url} target="_blank" rel="noreferrer">{photo.credit.name}</a> · <a href={photo.credit.licenseUrl} target="_blank" rel="noreferrer">{photo.credit.license}</a></p>)}
        </div></details> : null}
        <CommunityActions post={post} locale={locale} localOriginal={Boolean(localOriginal)} />
        {(canEditPublished || ownsLocalPost) && <div className="community-detail-edit-actions">
          {canEditPublished && publishedPost && <button type="button" className="button secondary" disabled={remote.status !== "ready" || remote.sessionStatus !== "ready" || Boolean(remote.updatingPostId)} onClick={() => { setEditFeedback(null); setEditing({ kind: "published", post: publishedPost }); }}><PenLine size={18} aria-hidden="true" />{t("编辑站点内容", "Редактировать публикацию")}</button>}
          {ownsLocalPost && <button type="button" className="button secondary" onClick={() => { const original = state.posts.find(item => item.id === id); if (original) { setEditFeedback(null); setEditing({ kind: "original", post: original }); } }}><PenLine size={18} aria-hidden="true" />{hasSharedCopy ? t("编辑我的原稿", "Редактировать мой оригинал") : t("编辑笔记", "Редактировать запись")}</button>}
        </div>}
        {editFeedback && <p className="community-detail-edit-feedback" role="status">{editFeedback === "published" ? t("帖子已更新。", "Публикация обновлена.") : state.storageUnavailable ? t("修改已保留在本次浏览中。", "Изменения остаются в текущей сессии.") : hasSharedCopy ? t("原稿已保存。", "Оригинал сохранён.") : t("笔记已保存。", "Запись сохранена.")}</p>}
        <CommunityFeatureManagement posts={[post]} schoolId={post.schoolId} locale={locale} />
        {ownsLocalPost && <div className="community-delete-area">{confirmDelete === "post" ? <div className="community-delete-confirm" onKeyDown={event => { if (event.key === "Escape") cancelDelete(); }}><p>{hasSharedCopy ? t("删除原稿？已发布内容及其互动记录会保留。", "Удалить оригинал? Опубликованная запись и реакции сохранятся.") : t("删除这篇笔记及其评论？此操作无法撤销。", "Удалить эту запись и её комментарии? Это действие нельзя отменить.")}</p><div><button type="button" className="text-button community-delete-button" onClick={() => { if (deleteCommunityPost(id)) router.replace(localOriginal ? "/me#my-library" : `/community?school=${post.schoolId}`); }}>{t("确认删除", "Удалить")}</button><button type="button" autoFocus className="text-button" onClick={cancelDelete}>{t("取消", "Отмена")}</button></div></div> : <button type="button" id="community-delete-post" className="text-button community-delete-button" onClick={() => setConfirmDelete("post")}><Trash2 size={16} strokeWidth={1.75} />{hasSharedCopy ? t("删除原稿", "Удалить оригинал") : t("删除笔记", "Удалить запись")}</button>}</div>}
      </div>
    </article>
    {publicThread && <PublicComments key={id} postId={id} locale={locale} />}
    {(!publicThread || comments.length > 0) && <LocalThread className="community-comments" id={publicThread ? "device-comments" : "comments"}>
      {publicThread ? <summary>{t("以前保存在此设备的评论", "Прежние комментарии на этом устройстве")} · {comments.length}</summary> :
      <div className="community-comments-heading"><h2>{t("本机评论", "Локальные комментарии")}</h2><span>{comments.length}</span></div>}
      {!publicThread && <form className="community-comment-form" onSubmit={submitComment} noValidate>
        <label htmlFor="community-comment">{t("说说你的想法", "Поделитесь мыслями")}</label>
        <textarea id="community-comment" ref={commentInput} value={comment} onChange={event => { setComment(event.target.value); setFeedback(null); }} rows={3} maxLength={1000} required aria-invalid={feedback === "empty"} aria-describedby="community-comment-help community-comment-feedback" />
        <div className="community-comment-form-bottom"><span id="community-comment-help" className="community-field-help">{comment.length}/1000</span><button type="submit" className="button primary button-sticker"><Send size={20} strokeWidth={1.75} />{state.storageUnavailable ? t("暂存评论", "Сохранить временно") : t("保存评论", "Сохранить комментарий")}</button></div>
        <p id="community-comment-feedback" className={`community-form-feedback${feedback === "saved" || feedback === "deleted" ? " is-success" : ""}`} role="status">{feedback === "empty" ? t("写一点内容再保存吧。", "Перед сохранением напишите комментарий.") : feedback === "failed" ? t("暂时无法保存，请检查内容后重试。", "Не удалось сохранить. Проверьте текст и попробуйте ещё раз.") : feedback === "deleted" ? t("评论已删除。", "Комментарий удалён.") : feedback === "saved" ? state.storageUnavailable ? t("评论已暂存，刷新后可能丢失。", "Комментарий сохранён временно и может исчезнуть после обновления.") : t("评论已保存。", "Комментарий сохранён.") : ""}</p>
      </form>}
      {comments.length ? <ol className="community-comment-list">{comments.map(item => <li key={item.id}><span className="community-avatar" aria-hidden="true">{t("我", "Я")}</span><div><strong>{t("我", "Я")}</strong><p>{item.body}</p>{confirmDelete === item.id ? <div className="community-delete-confirm" onKeyDown={event => { if (event.key === "Escape") cancelDelete(); }}><p>{t("删除这条评论？", "Удалить этот комментарий?")}</p><div><button type="button" className="text-button community-delete-button" onClick={() => { if (deleteCommunityComment(id, item.id)) { setConfirmDelete(null); setFeedback("deleted"); commentInput.current?.focus(); } }}>{t("确认删除", "Удалить")}</button><button type="button" autoFocus className="text-button" onClick={cancelDelete}>{t("取消", "Отмена")}</button></div></div> : <button type="button" id={`community-delete-${item.id}`} className="text-button community-delete-button" onClick={() => setConfirmDelete(item.id)} aria-label={t("删除这条评论", "Удалить этот комментарий")}><Trash2 size={16} strokeWidth={1.75} />{t("删除", "Удалить")}</button>}</div></li>)}</ol> : <p className="community-no-comments">{t("还没有评论，留下一句想法吧。", "Комментариев пока нет. Оставьте первую мысль.")}</p>}
    </LocalThread>}
    <WorkspaceDialog open={editing !== null} onClose={() => { if (!editorBusy) setEditing(null); }} title={editing?.kind === "published" ? t("编辑站点帖子", "Редактировать публикацию") : t("编辑我的笔记", "Редактировать мою запись")} variant={editing?.kind === "published" ? "guide" : "default"} headerActions={<LanguageMenu tone="light" />}>
      {editing?.kind === "published" ? <PublishedCommunityEditor key={editing.post.id} post={editing.post} posts={remote.posts} locale={locale} onBusyChange={setEditorBusy} onCancel={() => setEditing(null)} onSave={async document => {
        const result = await updateRemoteCommunityPost(document);
        if (!result.ok) throw new Error(result.error);
        setEditorBusy(false); setEditing(null); setEditFeedback("published");
      }} /> : editing && <CommunityComposer key={editing.post.id} post={editing.post} schoolId={editing.post.schoolId} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setEditFeedback("original"); }} />}
    </WorkspaceDialog>
  </div>;
}
