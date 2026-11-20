"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, Bookmark, ChevronDown, GraduationCap, Heart, LayoutGrid, List, MessageCircle, PenLine, Settings2, Sparkles } from "lucide-react";
import { CommunityCover } from "@/components/community-cover";
import { FrameCreature } from "@/components/frame-creature";
import { ContentPostCard, ContentPostCopy, PostByline } from "@/components/content-post";
import { collectTagCounts, ContentTags, TagFilter } from "@/components/content-tags";
import { MorphPagination } from "@/components/morph-pagination";
import { GlassSelect } from "@/components/glass-select";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { SocialLauncher } from "@/components/social-panel";
import "@/app/account-center.css";
import "@/app/community-tags.css";
import type { CommunityPost } from "@/data/community-content";
import { getCommunityPosts, setCommunitySchool, toggleCommunityLike, toggleCommunitySave, updateCommunityDraft, useCommunityState } from "@/lib/community-store";
import { CommunityComposer } from "@/components/community-composer";
import { communityTopics } from "@/data/community-topics";
import { refreshCommunityRemote, setCommunityPostLike, updateRemoteFeatured, useCommunityRemoteState } from "@/lib/community-remote-store";
import { useMemberSession } from "@/components/member-session";
import { MemberAuth } from "@/components/member-auth";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { useHomeState, type Locale } from "@/lib/home-store";
import { getSchool, isSchoolId, schoolOptions, type SchoolId } from "@/data/school-options";
import { COMMUNITY_FEATURED_LIMIT } from "@/lib/community-limits.mjs";
import { normalizeTag, tagKey } from "@/lib/content-tags.mjs";

export { communityTopics } from "@/data/community-topics";

export function communityTagHref(post: CommunityPost, tag: string, query = "") {
  const params = new URLSearchParams(query);
  params.set("school", post.schoolId);
  params.set("tag", tag);
  if (params.get("view") !== "saved") {
    if (post.kind === "discussion") params.set("view", "discussion");
    else params.delete("view");
  }
  return `/community?${params}`;
}

export function CommunityActions({ post, locale, showComment = true, localOriginal = false, onUnsave }: { post: CommunityPost; locale: Locale; showComment?: boolean; localOriginal?: boolean; onUnsave?: (trigger: HTMLButtonElement) => void }) {
  const state = useCommunityState();
  const remote = useCommunityRemoteState();
  const shared = !localOriginal && (post.demo || state.sharedPosts.some(item => item.id === post.id));
  const count = shared ? remote.commentCounts[post.id] ?? (remote.status === "ready" ? 0 : "…") : state.comments[post.id]?.length ?? 0;
  const member = useMemberSession();
  const [login, setLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const activity = remote.activity;
  const liked = shared ? Boolean(activity && member.user && activity.viewerId === member.user.id && activity.likedIds.includes(post.id)) : state.liked.includes(post.id);
  const likes = shared ? activity?.likeCounts[post.id] ?? (activity ? 0 : "…") : Number(liked);
  async function like() {
    if (!shared) { toggleCommunityLike(post.id); return; }
    if (!member.user) { setLogin(true); return; }
    setBusy(true); setFailed(false);
    try { await setCommunityPostLike(post.id, !liked, member.user.id); }
    catch { setFailed(true); void member.refresh(); }
    finally { setBusy(false); }
  }
  const saved = state.saved.includes(post.id);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <div className="community-actions">
    {login && <WorkspaceDialog open={!member.user} onClose={() => setLogin(false)} title={t("登录后点赞", "Войти, чтобы поставить отметку")}><MemberAuth compact onAuthenticated={() => setLogin(false)} /></WorkspaceDialog>}
    {failed && <span role="alert">{t("点赞未保存，请重试。", "Не удалось сохранить отметку. Попробуйте ещё раз.")}</span>}
    <button type="button" className={`community-action${liked ? " is-active" : ""}`} aria-pressed={liked} disabled={!state.hydrated || busy || (shared && !member.loaded)}
      aria-label={`${liked ? t("取消喜欢", "Убрать отметку «Нравится»") : t("喜欢", "Нравится")}: ${post.title[locale]}`}
      onClick={() => void like()}><Heart size={20} strokeWidth={1.75} fill={liked ? "currentColor" : "none"} /><span>{likes}</span></button>
    {showComment && <Link className="community-action" href={`/community/${post.id}${localOriginal ? "?local=1" : ""}#comments`} aria-label={t(`查看评论：${post.title.zh}`, `Комментарии: ${post.title.ru}`)}>
      <MessageCircle size={20} strokeWidth={1.75} /><span>{count}</span></Link>}
    <button type="button" data-community-save className={`community-action community-save${saved ? " is-active" : ""}`} aria-pressed={saved} disabled={!state.hydrated}
      aria-label={`${saved ? t("取消收藏", "Убрать из сохранённого") : t("收藏", "Сохранить")}: ${post.title[locale]}`}
      onClick={event => { if (saved) onUnsave?.(event.currentTarget); toggleCommunitySave(post.id); }}><Bookmark size={20} strokeWidth={1.75} fill={saved ? "currentColor" : "none"} /><span>{saved ? t("已收藏", "Сохранено") : t("收藏", "Сохранить")}</span></button>
  </div>;
}

export function CommunityPostCard({ post, locale, linear = false, shared = false, localOriginal = false, actions, onUnsave, tagQuery }: { post: CommunityPost; locale: Locale; linear?: boolean; shared?: boolean; localOriginal?: boolean; actions?: ReactNode; onUnsave?: (trigger: HTMLButtonElement) => void; tagQuery?: string }) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <ContentPostCard className={`community-card${linear ? " community-card--discussion" : ""}`} footer={<>
    <PostByline name={post.author?.[locale] ?? (post.demo ? "StudentPath" : shared && !localOriginal ? t("未署名", "Без подписи") : t("我", "Я"))} avatar={post.demo || shared ? "S" : t("我", "Я")} />
    <CommunityActions post={post} locale={locale} localOriginal={localOriginal} onUnsave={onUnsave} />
    {actions}
  </>}>
    <Link className="content-post-link" href={`/community/${post.id}${localOriginal ? "?local=1" : ""}`}>
      {!linear && <CommunityCover post={post} locale={locale} />}
      <ContentPostCopy category={communityTopics[post.topic][locale]} title={<>{post.title[locale]}{linear && <ArrowUpRight size={20} strokeWidth={1.75} aria-hidden="true" />}</>}>
        {linear && <p>{post.body[locale].split("\n")[0]}</p>}
      </ContentPostCopy>
    </Link>
    {Boolean(post.tags?.length) && <div className="community-post-tags"><ContentTags tags={post.tags} hrefForTag={tag => communityTagHref(post, tag, tagQuery)} /></div>}
  </ContentPostCard>;
}

export function CommunityFeatureManagement({ posts, schoolId, locale }: { posts: CommunityPost[]; schoolId: SchoolId; locale: Locale }) {
  const state = useCommunityState();
  const remote = useCommunityRemoteState();
  const [feedback, setFeedback] = useState<"updated" | "published" | "refresh" | "unauthorized" | "failed" | "limit" | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<string | null>(null);
  const management = useRef<HTMLDetailsElement>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const apply = async (post: CommunityPost, featured: boolean, trigger: HTMLInputElement | HTMLButtonElement, publish = false) => {
    const container = management.current;
    let focusMoved = false;
    const trackFocus = (event: FocusEvent) => { if (event.target !== document.body && event.target !== trigger) focusMoved = true; };
    document.addEventListener("focusin", trackFocus);
    setFeedback(null);
    try {
      const result = await updateRemoteFeatured(post.id, featured, publish ? post : undefined);
      if (result.ok) { setConfirmPublish(null); setFeedback(result.refreshed ? publish ? "published" : "updated" : "refresh"); }
      else setFeedback(result.error === "unauthorized" ? "unauthorized" : result.error === "featured_limit" ? "limit" : "failed");
    } finally {
      document.removeEventListener("focusin", trackFocus);
      // Disabling a pending control can move focus to body. Restore only our own lost focus,
      // after React has enabled the checkbox or replaced a successful publish button with one.
      requestAnimationFrame(() => {
        if (focusMoved || management.current !== container || !container?.isConnected || !container.open
          || (document.activeElement !== document.body && document.activeElement !== trigger)) return;
        const checkbox = document.getElementById(`community-feature-${post.id}`);
        if (checkbox instanceof HTMLInputElement && container.contains(checkbox) && !checkbox.disabled) checkbox.focus({ preventScroll: true });
        else if (trigger.isConnected && !trigger.disabled) trigger.focus({ preventScroll: true });
      });
    }
  };
  const cancelPublish = () => {
    const buttonId = `publish-feature-${confirmPublish}`;
    setConfirmPublish(null);
    requestAnimationFrame(() => document.getElementById(buttonId)?.focus());
  };
  if (!remote.session?.authenticated) return feedback === "unauthorized" ? <div className="community-session-expired"><p role="status">{t("登录状态已过期，请重新登录后继续。", "Сессия истекла. Войдите снова, чтобы продолжить.")}</p><Link href="/me#admin" className="text-button">{t("前往管理员登录", "Войти как администратор")}</Link></div> : null;
  const available = remote.status === "ready" && remote.sessionStatus === "ready" && !remote.updatingPostId;
  const manageable = posts.filter(post => remote.posts.some(item => item.id === post.id) || state.posts.some(item => item.id === post.id));
  const featuredCount = remote.posts.filter(post => post.schoolId === schoolId && remote.featuredIds.includes(post.id)).length;
  const atLimit = featuredCount >= COMMUNITY_FEATURED_LIMIT;
  return <details ref={management} className="community-feature-management">
    <summary><Settings2 size={20} aria-hidden="true" /><span>{t("精选管理", "Управление подборкой")}</span><ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="community-feature-management-body">
      <p>{t("取消精选不会删除已发布内容。", "Удаление из подборки не удаляет опубликованную запись.")}</p>
      <strong>{getSchool(schoolId).shortLabel[locale]} · {featuredCount} / {COMMUNITY_FEATURED_LIMIT}</strong>
      {atLimit && <p role="status">{t("精选已满，取消一条后即可添加。", "Подборка заполнена. Уберите одну запись, чтобы добавить другую.")}</p>}
      {remote.status === "error" && <button type="button" className="text-button" onClick={() => void refreshCommunityRemote()}>{t("服务暂不可用，重新读取", "Сервис недоступен. Повторить")}</button>}
      {manageable.length ? <div className="community-feature-options">{manageable.map(post => {
        const shared = remote.posts.some(item => item.id === post.id);
        return <div className="community-feature-option" key={post.id}>{shared ? <label>
          <input id={`community-feature-${post.id}`} type="checkbox" checked={remote.featuredIds.includes(post.id)} disabled={!available || (atLimit && !remote.featuredIds.includes(post.id))} onChange={event => void apply(post, event.target.checked, event.currentTarget)} />
          <span><strong>{post.title[locale]}</strong><small>{post.kind === "note" ? t("笔记", "Заметка") : t("讨论", "Обсуждение")}</small></span>
        </label> : <div className="community-unpublished-option"><strong>{post.title[locale]}</strong><small>{t("未发布", "Не опубликовано")}</small><button type="button" id={`publish-feature-${post.id}`} className="text-button" disabled={!available || atLimit} onClick={() => { setFeedback(null); setConfirmPublish(post.id); }}>{t("发布并加精", "Опубликовать и добавить в подборку")}</button></div>}
        {confirmPublish === post.id && <div className="community-publish-confirm" onKeyDown={event => { if (event.key === "Escape" && !remote.updatingPostId) cancelPublish(); }}><p>{t("确认发布这篇内容并加入精选？其他人将能阅读。", "Опубликовать эту запись и добавить в подборку? Её смогут прочитать другие посетители.")}</p><strong>{getSchool(post.schoolId).shortLabel[locale]} · {post.title[locale]}</strong><blockquote>{post.body[locale]}</blockquote><div><button type="button" autoFocus className="button primary" disabled={!available || atLimit} onClick={event => void apply(post, true, event.currentTarget, true)}>{t("确认发布并加精", "Подтвердить публикацию")}</button><button type="button" className="text-button" disabled={Boolean(remote.updatingPostId)} onClick={cancelPublish}>{t("取消", "Отмена")}</button></div></div>}
        </div>;
      })}</div> : <p>{t("这个学校还没有可加入精选的内容。", "В этом сообществе пока нет записей для подборки.")}</p>}
      <p className={`community-form-feedback${feedback === "updated" || feedback === "published" ? " is-success" : ""}`} role="status">{remote.updatingPostId ? t("正在保存…", "Сохраняем…") : feedback === "limit" ? t("每个学校最多精选 7 条，请先取消一条。", "В подборке вуза может быть до 7 записей. Сначала уберите одну.") : feedback === "failed" ? t("保存失败，请重试。", "Не удалось сохранить. Повторите попытку.") : feedback === "refresh" ? t("已保存，列表更新失败，请重试。", "Сохранено, но список не обновился. Повторите загрузку.") : feedback === "published" ? t("已发布并加入精选。", "Запись опубликована и добавлена в подборку.") : feedback === "updated" ? t("精选已保存。", "Подборка сохранена.") : ""}</p>
      <Link href="/me#admin" className="text-button">{t("管理员账号", "Аккаунт администратора")}</Link>
    </div>
  </details>;
}

export function CommunityRemoteNotice({ locale }: { locale: Locale }) {
  const remote = useCommunityRemoteState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  if (remote.status !== "error" && remote.sessionStatus !== "error") return null;
  return <div className="community-service-note" role="status"><p>{remote.status === "error" ? t("内容暂时无法更新，请重试。", "Не удалось обновить записи. Повторите попытку.") : t("暂时无法确认登录状态，请稍后重试。", "Не удалось проверить статус входа. Попробуйте позже.")}</p><button type="button" className="text-button" onClick={() => void refreshCommunityRemote()}>{t("重试", "Повторить")}</button></div>;
}

function FeaturedCardContent({ post, locale }: { post: CommunityPost; locale: Locale }) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <><CommunityCover post={post} locale={locale} /><div className="community-featured-copy"><span className="community-topic">{communityTopics[post.topic][locale]} · {t("精选", "Подборка")}</span><h2>{post.title[locale]}</h2><span className="community-featured-read">{t("打开阅读", "Читать историю")}<ArrowUpRight size={18} /></span></div></>;
}

function CommunityFeatured({ posts, locale }: { posts: CommunityPost[]; locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState<{ post: CommunityPost; direction: "next" | "previous" } | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCard = useRef<HTMLAnchorElement>(null);
  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); }, []);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  if (!posts.length) return <section className="community-featured community-featured-empty material-glass material-glass--dark"><Sparkles size={24} aria-hidden="true" /><h2>{t("这里还没有精选", "Подборка пока пуста")}</h2><p>{t("当前学校和主题下暂无站点精选。可以切换主题，或继续浏览下方内容。", "Для этого вуза и темы пока нет подборки сайта. Смените тему или читайте другие записи ниже.")}</p></section>;
  const current = index % posts.length;
  const post = posts[current];
  const select = (next: number, direction: -1 | 1 = next > current ? 1 : -1) => {
    if (posts.length < 2 || next === current) return;
    const restoreCardFocus = document.activeElement === currentCard.current;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTransition({ post, direction: direction === 1 ? "next" : "previous" });
      // This timer only finishes a user-triggered transition; it never advances a slide.
      transitionTimer.current = setTimeout(() => { setTransition(null); }, 320);
    } else { setTransition(null); }
    setIndex(next);
    if (restoreCardFocus) requestAnimationFrame(() => {
      if (document.activeElement === document.body) currentCard.current?.focus({ preventScroll: true });
    });
  };
  const advance = (direction: -1 | 1) => select((current + direction + posts.length) % posts.length, direction);
  return <div className="community-featured-scene creature-frame">
    <FrameCreature kind="cat" placement="top-right" />
    <div className="community-featured-backdrop" aria-hidden="true"><div key={post.id}><CommunityCover post={post} locale={locale} /></div></div>
    <section className="community-featured material-glass material-glass--dark material-glass--liquid" aria-label={t("社区精选展示", "Подборка сообщества")} aria-roledescription={t("轮播", "Карусель")} onKeyDown={event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); advance(event.key === "ArrowRight" ? 1 : -1); }
  }}>
    <div className="community-featured-heading"><span><Sparkles size={20} />{t("社区精选", "Подборка сообщества")}</span></div>
    <div className={`community-featured-stage${posts.length < 3 ? " community-featured-stage--small" : ""}`}>
      {posts.length > 2 && <button type="button" className="community-featured-side motion-enlarge" onClick={() => advance(-1)} aria-label={t("查看上一条推荐", "Предыдущая история")}><CommunityCover post={posts[(current + posts.length - 1) % posts.length]} locale={locale} /><span>{posts[(current + posts.length - 1) % posts.length].title[locale]}</span></button>}
      <div className={`community-featured-viewport${transition ? ` is-moving is-moving--${transition.direction}` : ""}`}>
        {/* Hidden full-size cards reserve the tallest title, preventing layout jumps. */}
        {posts.map(item => <div key={item.id} className="community-featured-main community-featured-sizer" aria-hidden="true" inert><FeaturedCardContent post={item} locale={locale} /></div>)}
        {transition && <div key={`outgoing-${transition.post.id}`} className="community-featured-main community-featured-outgoing" aria-hidden="true" inert><FeaturedCardContent post={transition.post} locale={locale} /></div>}
        <Link ref={currentCard} key={`current-${post.id}`} className="community-featured-main community-featured-current motion-enlarge" href={`/community/${post.id}`}><FeaturedCardContent post={post} locale={locale} /></Link>
      </div>
      {posts.length > 2 && <button type="button" className="community-featured-side motion-enlarge" onClick={() => advance(1)} aria-label={t("查看下一条推荐", "Следующая история")}><CommunityCover post={posts[(current + 1) % posts.length]} locale={locale} /><span>{posts[(current + 1) % posts.length].title[locale]}</span></button>}
    </div>
    {posts.length > 1 && <div className="community-featured-controls"><MorphPagination
      labels={posts.map((item, itemIndex) => t(`第 ${itemIndex + 1} 条：${item.title.zh}`, `Запись ${itemIndex + 1}: ${item.title.ru}`))}
      activeIndex={current} onSelect={select} label={t("切换精选", "Переключить подборку")}
      status={t(`第 ${current + 1} 条，共 ${posts.length} 条`, `Запись ${current + 1} из ${posts.length}`)}
    /></div>}
  </section></div>;
}

export function CommunityPage(props: Parameters<typeof MemberCommunityPage>[0]) {
  const member = useMemberSession();
  return <MemberCommunityPage key={member.user?.id ?? "guest"} {...props} />;
}
function MemberCommunityPage({ initialView = "discover" }: { initialView?: "discover" | "discussion" | "saved"; initialSchool?: SchoolId }) {
  const home = useHomeState();
  const { locale } = home;
  const state = useCommunityState();
  const remote = useCommunityRemoteState();
  const router = useRouter();
  const params = useSearchParams();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const requestedView = params.get("view");
  const view = requestedView === "discussion" || requestedView === "saved" ? requestedView : requestedView === null ? initialView : "discover";
  const requestedTopic = params.get("topic");
  const topic = requestedTopic === "campus" || requestedTopic === "daily" || requestedTopic === "arrival" ? requestedTopic : "all";
  const requestedSchool = params.get("school");
  const querySchool = isSchoolId(requestedSchool) ? requestedSchool : undefined;
  let selectedTag = "";
  try { selectedTag = normalizeTag(params.get("tag") ?? ""); } catch { /* An invalid URL tag does not hide the community. */ }
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [composing, setComposing] = useState(false);
  const writeButton = useRef<HTMLButtonElement>(null);
  const tabs = [
    { id: "discover" as const, label: t("发现", "Открыть") },
    { id: "discussion" as const, label: t("讨论", "Обсуждения") },
    { id: "saved" as const, label: t("收藏", "Сохранённое") },
  ];
  useEffect(() => { if (state.hydrated && querySchool) setCommunitySchool(querySchool); }, [querySchool, state.hydrated]);
  const ownSchool: SchoolId = home.profileSet ? home.university : "msu";
  const activeSchool = querySchool ?? state.selectedSchool ?? ownSchool;
  const school = schoolOptions.find(option => option.id === activeSchool)!;
  const schoolPosts = getCommunityPosts(state, activeSchool);
  const publicPosts = schoolPosts.filter(post => post.demo || state.sharedPosts.some(item => item.id === post.id));
  const topicPosts = (view === "saved" ? schoolPosts : publicPosts).filter(post => topic === "all" || post.topic === topic);
  const viewPosts = topicPosts.filter(post => view === "saved" ? state.saved.includes(post.id) : post.kind === (view === "discover" ? "note" : "discussion"));
  const tagItems = collectTagCounts(viewPosts);
  const matchesTag = (post: CommunityPost) => !selectedTag || post.tags?.some(tag => tagKey(tag) === tagKey(selectedTag));
  const matchingPosts = viewPosts.filter(matchesTag);
  const remoteById = new Map(remote.posts.map(post => [post.id, post]));
  const featuredPosts = remote.featuredIds.flatMap(id => remoteById.has(id) ? [remoteById.get(id)!] : []).filter(post => post.schoolId === activeSchool).slice(0, COMMUNITY_FEATURED_LIMIT).filter(post => topic === "all" || post.topic === topic).filter(matchesTag);
  const displayedFeaturedIds = new Set(view === "discover" && remote.status === "ready" ? featuredPosts.map(post => post.id) : []);
  const posts = matchingPosts.filter(post => !displayedFeaturedIds.has(post.id));
  const showFeed = posts.length > 0 || displayedFeaturedIds.size === 0;
  const updateFilters = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/community${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const setView = (value: "discover" | "discussion" | "saved") => updateFilters({ view: value === "discover" ? null : value });
  const setTopic = (value: CommunityPost["topic"] | "all") => updateFilters({ topic: value === "all" ? null : value });
  const selectSchool = (id: SchoolId | null) => {
    setCommunitySchool(id);
    updateFilters({ school: id });
  };
  const openComposer = () => { if (!state.draft.schoolId || (!state.draft.title.trim() && !state.draft.body.trim() && !state.draft.tags?.length)) updateCommunityDraft({ schoolId: activeSchool }); setComposing(true); };
  const closeComposer = () => { setComposing(false); writeButton.current?.focus(); };
  function openSavedPost(id: string, published?: boolean) {
    // A live feed refresh can interrupt a soft navigation just after publication.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/community/${encodeURIComponent(id)}${published ? "" : "?local=1"}`);
  }
  const changeTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setView(tabs[next].id);
    document.getElementById(`community-tab-${tabs[next].id}`)?.focus();
  };

  return <div className="workspace-container community-page community-directory">
    <div className="community-heading-row">
      <div className="community-heading-intro"><div className="workspace-heading"><h1>{t("留学社区", "Студенческое сообщество")}</h1><p>{t("在这里，遇见留学生活的另一面。", "У студенческой жизни так много сторон.")}</p></div><GuidanceIllustration kind="chat" className="community-heading-art" /></div>
      <div className="community-heading-actions"><SocialLauncher /><button type="button" ref={writeButton} className="button primary button-sticker community-write" disabled={!state.hydrated} aria-expanded={composing} aria-controls="community-composer" onClick={openComposer}><PenLine size={20} strokeWidth={1.75} />{t("写点什么", "Написать")}</button></div>
    </div>
    <div className="community-school-switch"><GlassSelect value={activeSchool} disabled={!state.hydrated} onChange={value => selectSchool(value as SchoolId)} options={schoolOptions.map(option => ({ value: option.id, label: option.label[locale] }))} ariaLabel={t("切换学校社区", "Выбрать сообщество вуза")} icon={<GraduationCap size={22} strokeWidth={1.75} />} />{(querySchool || state.selectedSchool) ? <button type="button" className="text-button" onClick={() => selectSchool(null)}>{home.profileSet ? t("回到我的学校", "Вернуться в мой вуз") : t("恢复默认社区", "Сообщество по умолчанию")}</button> : <span>{home.profileSet ? t("默认跟随你的学校", "По умолчанию — ваш вуз") : t("尚未设置学校，先逛逛莫大社区", "Вуз пока не выбран. Начнём с МГУ")}</span>}</div>
    <CommunityRemoteNotice locale={locale} />
    {state.storageUnavailable && <p className="community-storage-note" role="status">{t("暂时无法保存，关闭或刷新后可能丢失记录。", "Не удалось сохранить записи. После обновления или закрытия страницы они могут исчезнуть.")}</p>}

    {composing && <CommunityComposer schoolId={activeSchool} onClose={closeComposer} onSaved={openSavedPost} />}

    <div className="community-directory-layout"><aside className="community-school-rail" aria-label={t("当前学校社区", "Текущее сообщество")}><div className="community-school-card"><GraduationCap size={32} strokeWidth={1.5} /><strong>{school.shortLabel[locale]}</strong><p>{school.label[locale]}</p><span>{t("留学生活，在这里相遇。", "Место для студенческих историй.")}</span></div><div className="community-rail-note"><Sparkles size={22} strokeWidth={1.75} /><p>{t("不同的学校，各自的日常。选一个主题，看看想聊的话。", "У каждого вуза свои будни. Выберите тему для чтения или разговора.")}</p></div></aside><div className="community-content-column">
    <div className="community-tabs" role="tablist" aria-label={t("社区内容", "Разделы сообщества")}>
      {tabs.map((tab, index) => <button type="button" key={tab.id} role="tab" id={`community-tab-${tab.id}`} aria-controls="community-results" aria-selected={view === tab.id} tabIndex={view === tab.id ? 0 : -1} onKeyDown={event => changeTab(event, index)} onClick={() => setView(tab.id)}>{tab.label}</button>)}
    </div>
    <div id="community-results" role="tabpanel" aria-labelledby={`community-tab-${view}`} tabIndex={0} className="community-results">
      <div className="community-topic-filter" role="group" aria-label={t("选择社区主题", "Выбрать тему")}><button type="button" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>{t("全部主题", "Все темы")}</button>{Object.entries(communityTopics).map(([id, copy]) => <button key={id} type="button" aria-pressed={topic === id} onClick={() => setTopic(id as CommunityPost["topic"])}># {copy[locale]}</button>)}</div>
      {(tagItems.length > 0 || selectedTag) && <div className="community-tag-filter"><TagFilter items={tagItems} selected={selectedTag} onSelect={tag => updateFilters({ tag: tag || null })} /></div>}
      {!state.hydrated ? <p className="community-empty" role="status">{t("正在加载…", "Загружаем…")}</p> : <>
      {view === "discover" && <>{remote.status === "ready" ? <CommunityFeatured key={`${activeSchool}-${topic}-${featuredPosts.map(post => post.id).join(",")}`} posts={featuredPosts} locale={locale} /> : <section className="community-featured community-featured-empty material-glass material-glass--dark" aria-busy={remote.status !== "error"}><Sparkles size={24} aria-hidden="true" /><h2>{t("社区精选", "Подборка сообщества")}</h2><p role="status">{remote.status === "error" ? t("站点精选暂时不可用，请重试连接。", "Подборка сайта недоступна. Повторите подключение.") : t("正在读取站点精选…", "Загружаем подборку сайта…")}</p></section>}<CommunityFeatureManagement key={activeSchool} posts={schoolPosts} schoolId={activeSchool} locale={locale} /></>}
      {showFeed && <><div className="community-feed-heading"><h2>{view === "discussion" ? t("聊聊校园里的事", "О чём говорят в кампусе") : view === "saved" ? t("留给下次慢慢看", "Чтобы вернуться позже") : t("发现更多日常", "Больше повседневных историй")}</h2>{view !== "discussion" && <div className="community-layout-switch" role="group" aria-label={t("内容布局", "Вид записей")}><button type="button" aria-pressed={layout === "grid"} aria-label={t("卡片布局", "Карточки")} onClick={() => setLayout("grid")}><LayoutGrid size={20} /></button><button type="button" aria-pressed={layout === "list"} aria-label={t("列表布局", "Список")} onClick={() => setLayout("list")}><List size={20} /></button></div>}</div>
      {posts.length ? <div className={view === "discussion" || layout === "list" ? "community-discussions" : "community-grid"}>
        {posts.map(post => <CommunityPostCard key={post.id} post={post} locale={locale} shared={state.sharedPosts.some(item => item.id === post.id)} linear={view === "discussion" || layout === "list"} tagQuery={params.toString()} />)}
      </div> : <div className="workspace-panel community-empty"><Bookmark size={32} strokeWidth={1.75} aria-hidden="true" /><h2>{selectedTag ? t("没有匹配这个标签的内容", "По этому тегу ничего не найдено") : view === "saved" ? t("喜欢的内容，慢慢收集。", "Собирайте то, что нравится.") : t("这里，等你留下第一段故事。", "Здесь есть место вашей истории.")}</h2><p>{selectedTag ? t("试试其他标签，或查看全部内容。", "Выберите другой тег или посмотрите все записи.") : topic !== "all" ? t("当前学校的这个主题还没有匹配内容。", "В этом сообществе пока нет записей по выбранной теме.") : view === "saved" ? t("当前学校还没有收藏。", "В этом вузе пока нет сохранённого.") : t("当前分区还没有内容，写下第一篇笔记吧。", "В этом разделе пока пусто. Напишите первую заметку.")}</p>{selectedTag ? <button type="button" className="button secondary" onClick={() => updateFilters({ tag: null })}>{t("清除标签筛选", "Сбросить тег")}</button> : topic !== "all" ? <button type="button" className="button secondary" onClick={() => setTopic("all")}>{t("查看全部主题", "Все темы")}</button> : view === "saved" ? <button type="button" className="button secondary" onClick={() => setView("discover")}>{t("去发现", "Посмотреть заметки")}</button> : <button type="button" className="button secondary" onClick={openComposer}>{t("写点什么", "Написать")}</button>}</div>}
      </>}
      </>}
    </div>
    </div></div>
  </div>;
}
