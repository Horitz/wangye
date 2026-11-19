"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Check, GraduationCap, X } from "lucide-react";
import { GlassSelect } from "@/components/glass-select";
import { collectTagCounts, TagEditor, type TagEditorHandle } from "@/components/content-tags";
import { communityTopics } from "@/data/community-topics";
import type { CommunityPost } from "@/data/community-content";
import { getSchool, schoolOptions, type SchoolId } from "@/data/school-options";
import { clearPublishedDraft, createCommunityPost, getCommunityPosts, updateCommunityDraft, updateCommunityPost, useCommunityState, type CommunityDraft } from "@/lib/community-store";
import { useHomeState } from "@/lib/home-store";
import { useMemberSession } from "@/components/member-session";
import { MemberAuth } from "@/components/member-auth";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { refreshCommunityRemote } from "@/lib/community-remote-store";

/** The community and personal library use one editor and the same browser-owned records. */
export function CommunityComposer({ schoolId, post, onClose, onSaved }: { schoolId: SchoolId; post?: CommunityPost; onClose: () => void; onSaved: (id: string, published?: boolean) => void }) {
  const state = useCommunityState();
  const member = useMemberSession();
  const [login, setLogin] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const publishId = useRef<string | null>(null);
  const canPublish = !post || !state.sharedPosts.some(item => item.id === post.id);
  const { locale } = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const formId = useId();
  const [edited, setEdited] = useState<CommunityDraft>(() => ({ title: post?.title.zh ?? "", body: post?.body.zh ?? "", kind: post?.kind ?? "note", topic: post?.topic ?? "daily", schoolId: post?.schoolId ?? schoolId, tags: [...(post?.tags ?? [])] }));
  const [error, setError] = useState<"title" | "body" | "save" | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const tagEditor = useRef<TagEditorHandle>(null);
  const draft = post ? edited : state.draft;
  const draftSchool = draft.schoolId ?? schoolId;
  const tagSuggestions = collectTagCounts(getCommunityPosts(state, draftSchool)).map(item => item.tag);
  const update = (patch: Partial<CommunityDraft>) => {
    if (post) setEdited(previous => ({ ...previous, ...patch }));
    else updateCommunityDraft({ ...patch, schoolId: patch.schoolId ?? draftSchool });
    setError(null);
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) return;
    if (draft.title.trim().length < 3) { setError("title"); titleInput.current?.focus(); return; }
    if (draft.body.trim().length < 10) { setError("body"); bodyInput.current?.focus(); return; }
    const tags = tagEditor.current?.commit();
    if (!tags) { event.currentTarget.reportValidity(); return; }
    if (!event.currentTarget.checkValidity()) { event.currentTarget.reportValidity(); return; }
    const trigger = (event.nativeEvent as SubmitEvent).submitter;
    if (canPublish && trigger?.getAttribute("value") === "publish") {
      if (!member.user) { setLogin(true); return; }
      const id = post?.id ?? (publishId.current ??= `community-${crypto.randomUUID()}`);
      setPublishing(true);
      try {
        const response = await fetch("/api/community/posts", { method: "POST", signal: AbortSignal.timeout(12000),
          headers: { "Content-Type": "application/json", "X-StudentPath-User": member.user.id },
          body: JSON.stringify({ id, ...draft, schoolId: draftSchool, tags }) });
        if (response.status === 401) { await member.refresh(); setLogin(true); return; }
        if (!response.ok) throw new Error();
        if (post) updateCommunityPost(post.id, { ...draft, tags, schoolId: draftSchool });
        else clearPublishedDraft({ ...draft, tags, schoolId: draftSchool });
        await refreshCommunityRemote();
        onSaved(id, true);
      } catch { setError("save"); }
      finally { setPublishing(false); }
      return;
    }
    const id = post ? updateCommunityPost(post.id, { ...draft, tags, schoolId: draftSchool }) ? post.id : null : createCommunityPost(draftSchool);
    if (id) onSaved(id); else setError("save");
  }
  return <section className="workspace-panel community-composer" id="community-composer" aria-labelledby={`${formId}-heading`} onKeyDown={event => { if (event.key === "Escape" && !publishing && !login) onClose(); }}>
    <div className="community-composer-heading"><h2 id={`${formId}-heading`}>{post ? t("编辑我的笔记", "Редактировать запись") : t("记下你的留学日常", "Запишите свою историю")}</h2><button type="button" className="icon-button" disabled={publishing} onClick={onClose} aria-label={post ? t("取消编辑", "Отменить изменения") : t("收起编辑器，保留草稿", "Свернуть редактор и оставить черновик")}><X size={20} /></button></div>
    {login && <WorkspaceDialog open={!member.user} onClose={() => setLogin(false)} title={t("登录后发布", "Вход для публикации")}><MemberAuth compact onAuthenticated={() => setLogin(false)} /></WorkspaceDialog>}
    <form onSubmit={submit} noValidate><fieldset className="community-compose-fields" disabled={publishing}>
      <div className="community-draft-school"><GraduationCap size={20} /><p>{t("所属学校：", "Вуз: ")}<strong>{getSchool(draftSchool).label[locale]}</strong></p><GlassSelect value={draftSchool} onChange={value => update({ schoolId: value as SchoolId })} options={schoolOptions.map(option => ({ value: option.id, label: option.label[locale] }))} ariaLabel={t("更改草稿所属学校", "Изменить вуз записи")} /></div>
      <div className="community-form-row">
        <GlassSelect label={t("形式", "Формат")} value={draft.kind} onChange={value => update({ kind: value as CommunityPost["kind"] })} options={[{ value: "note", label: t("生活笔记", "Заметка") }, { value: "discussion", label: t("发起讨论", "Обсуждение") }]} />
        <GlassSelect label={t("主题", "Тема")} value={draft.topic} onChange={value => update({ topic: value as CommunityPost["topic"] })} options={Object.entries(communityTopics).map(([value, copy]) => ({ value, label: copy[locale] }))} />
      </div>
      <label>{t("标题", "Заголовок")}<input ref={titleInput} autoFocus value={draft.title} maxLength={80} minLength={3} required aria-invalid={error === "title"} aria-describedby={`${formId}-title-help`} onChange={event => update({ title: event.target.value })} /></label>
      <span className="community-field-help" id={`${formId}-title-help`}>{t("3–80 个字符", "От 3 до 80 символов")} · {draft.title.length}/80</span>
      <label>{t("正文", "Текст")}<textarea ref={bodyInput} rows={5} value={draft.body} maxLength={3000} minLength={10} required aria-invalid={error === "body"} aria-describedby={`${formId}-body-help`} onChange={event => update({ body: event.target.value })} /></label>
      <span className="community-field-help" id={`${formId}-body-help`}>{draft.body.length}/3000</span>
      <TagEditor ref={tagEditor} value={draft.tags ?? []} onChange={tags => update({ tags })} suggestions={tagSuggestions} locale={locale} />
      {post && state.sharedPosts.some(item => item.id === post.id) && <p className="community-field-help">{t("仅修改原稿，已发布内容保持不变。", "Изменяется только оригинал. Опубликованная запись останется прежней.")}</p>}
      <p className="community-form-feedback" role="status">{error === "title" ? t("请填写至少 3 个字符的标题。", "Напишите заголовок не короче 3 символов.") : error === "body" ? t("请填写至少 10 个字符的正文。", "Напишите текст не короче 10 символов.") : error === "save" ? t("暂时无法保存，请检查内容后重试。", "Не удалось сохранить. Проверьте текст и попробуйте ещё раз.") : ""}</p>
      <div className="community-composer-actions"><button className="button secondary" type="submit" value="private">{t("保存到本机笔记", "Сохранить на устройстве")}</button>{canPublish && <button className="button primary button-sticker" type="submit" value="publish"><Check size={20} />{publishing ? t("正在发布…", "Публикуем…") : t("发布到社区", "Опубликовать в сообществе")}</button>}</div>
    </fieldset></form>
  </section>;
}
