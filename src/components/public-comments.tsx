"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Trash2 } from "lucide-react";
import { useMemberSession } from "@/components/member-session";
import { MemberAuth } from "@/components/member-auth";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { setPublicCommentCount } from "@/lib/community-remote-store";
import type { Locale } from "@/lib/home-store";

type Comment = { id: number; authorId: string; displayName: string; body: string };

export function PublicComments({ postId, locale }: { postId: string; locale: Locale }) {
  const member = useMemberSession();
  const [login, setLogin] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [readError, setReadError] = useState(false);
  const [writeError, setWriteError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const attempt = useRef<{ body: string; clientId: string } | null>(null);
  const revision = useRef(0);
  const writing = useRef(false);
  const reading = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const url = `/api/community/posts/${encodeURIComponent(postId)}/comments`;
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;

  const accept = useCallback((rows: Comment[]) => {
    setComments(rows); setReadError(false); setPublicCommentCount(postId, rows.length);
  }, [postId]);
  const refresh = useCallback(async () => {
    if (writing.current || reading.current) return;
    const controller = new AbortController();
    reading.current = controller;
    const seq = ++revision.current;
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (seq === revision.current) accept(data.comments);
    } catch { if (seq === revision.current) setReadError(true); }
    finally { if (reading.current === controller) reading.current = null; }
  }, [url, accept]);
  const invalidate = useCallback(() => { revision.current++; reading.current?.abort(); reading.current = null; }, []);
  useEffect(() => {
    const poll = () => { if (!document.hidden) void refresh(); };
    poll();
    const timer = window.setInterval(poll, 5000);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener("focus", poll);
    return () => { invalidate(); clearInterval(timer); document.removeEventListener("visibilitychange", poll); window.removeEventListener("focus", poll); };
  }, [refresh, invalidate]);

  async function write(method: "POST" | "DELETE", payload: object) {
    if (!member.user || writing.current) return;
    const seq = ++revision.current;
    writing.current = true;
    setBusy(true); setWriteError(false);
    try {
      const res = await fetch(url, { method, cache: "no-store", signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json", "X-StudentPath-User": member.user.id }, body: JSON.stringify(payload) });
      if (res.status === 401) void member.refresh();
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (seq !== revision.current) return;
      accept(data.comments); setDeleting(null);
      if (method === "POST") { attempt.current = null; setDraft(""); }
    } catch { if (seq === revision.current) setWriteError(true); }
    finally { writing.current = false; if (seq === revision.current) setBusy(false); }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) { input.current?.focus(); return; }
    if (attempt.current?.body !== body) attempt.current = { body, clientId: crypto.randomUUID() };
    void write("POST", attempt.current);
  };
  return <section className="community-comments" id="comments" aria-labelledby="public-comments-title">
    <div className="community-comments-heading"><h2 id="public-comments-title">{t("评论", "Комментарии")}</h2><span>{comments?.length ?? "…"}</span></div>
    {member.user ? <form className="community-comment-form" onSubmit={submit}>
      <label htmlFor="public-comment">{t("说说你的想法", "Поделитесь мыслями")}</label>
      <textarea ref={input} id="public-comment" rows={3} maxLength={1000} required readOnly={busy} value={draft} onChange={e => { setDraft(e.target.value); setWriteError(false); }} />
      <div className="community-comment-form-bottom"><span className="community-field-help">{draft.length}/1000</span><button type="submit" className="button primary button-sticker" disabled={busy || !draft.trim()}><Send size={20} />{t("发布评论", "Опубликовать")}</button></div>
    </form> : member.loaded && <button className="button secondary" onClick={() => setLogin(true)}>{t("登录后评论", "Войти, чтобы ответить")}</button>}
    <WorkspaceDialog open={login && !member.user} onClose={() => setLogin(false)} title={t("登录", "Вход")}><MemberAuth compact onAuthenticated={() => setLogin(false)} /></WorkspaceDialog>
    {writeError && <p role="alert">{t("操作未完成，请重试。", "Не удалось сохранить изменения. Попробуйте ещё раз.")}</p>}
    {readError && <p role="status">{t("暂时无法刷新评论。", "Не удалось обновить комментарии.")} <button type="button" className="text-button" onClick={() => void refresh()}>{t("重试", "Повторить")}</button></p>}
    {comments?.length ? <ol className="community-comment-list">{comments.map(item => <li key={item.id}>
      <span className="community-avatar" aria-hidden="true">{Array.from(item.displayName)[0]}</span>
      <div><strong>{item.displayName}</strong><p>{item.body}</p>
        {item.authorId === member.user?.id && (deleting === item.id ? <div className="community-delete-confirm">
          <button type="button" className="text-button community-delete-button" disabled={busy} onClick={() => void write("DELETE", { commentId: item.id })}>{t("确认删除", "Удалить")}</button>
          <button type="button" className="text-button" onClick={() => setDeleting(null)}>{t("取消", "Отмена")}</button>
        </div> : <button type="button" className="text-button community-delete-button" disabled={busy} onClick={() => setDeleting(item.id)}><Trash2 size={16} />{t("删除", "Удалить")}</button>)}
      </div></li>)}</ol> : comments && <p className="community-no-comments">{t("还没有评论。", "Пока нет комментариев.")}</p>}
  </section>;
}
