"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, LogOut, MessageCircle, RefreshCw, Search, Send, UserPlus, Users } from "lucide-react";
import { MemberAuth } from "@/components/member-auth";
import { useMemberSession } from "@/components/member-session";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { LanguageMenu } from "@/components/language-menu";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { useHomeState } from "@/lib/home-store";
import { socialErrorCode, socialErrorText, socialRequest, type FriendAction, type SocialFriends, type SocialMessage, type SocialMessages, type SocialUser } from "@/lib/social-client";
import "@/app/social.css";

function Avatar({ user }: { user: SocialUser }) {
  return <span className="social-avatar" aria-hidden="true">{Array.from(user.displayName || user.username)[0]}</span>;
}

export function SocialLauncher({ label, className = "button secondary" }: { label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const { locale } = useHomeState();
  const title = locale === "zh" ? "好友与聊天" : "Друзья и чат";
  return <><button type="button" className={className} onClick={() => setOpen(true)}><MessageCircle size={20} aria-hidden="true" />{label ?? title}</button><WorkspaceDialog open={open} onClose={() => setOpen(false)} title={title} variant="essentials" headerActions={<LanguageMenu tone="light" />}><SocialPanel /></WorkspaceDialog></>;
}

export function SocialPanel() {
  const { locale } = useHomeState();
  const session = useMemberSession();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <section className="social-panel" aria-label={t("好友与聊天", "Друзья и чат")}>
    {session.error && <div className="social-feedback" role="alert"><span>{socialErrorText(session.error, locale)}</span><button className="text-button" onClick={() => void session.refresh()}><RefreshCw size={18} />{t("重试", "Повторить")}</button></div>}
    {!session.loaded ? <p role="status">{t("正在连接…", "Подключение…")}</p> : session.user ? <MemberSocial key={session.user.id} user={session.user} /> : !session.error && <MemberAuth />}
  </section>;
}

function MemberSocial({ user }: { user: SocialUser }) {
  const member = useMemberSession();
  const { locale } = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const [snapshot, setSnapshot] = useState<SocialFriends | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"friends" | "search" | "requests">("friends");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SocialUser[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const alive = useRef(true);
  const friendRevision = useRef(0);
  const sendAttempts = useRef<Record<string, { body: string; clientId: string }>>({});
  const chatTitle = useRef<HTMLHeadingElement>(null);
  const friendButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusRequest = useRef<"chat" | string | null>(null);
  useLayoutEffect(() => {
    if (focusRequest.current === "chat") chatTitle.current?.focus({ preventScroll: true });
    else if (focusRequest.current) friendButtons.current.get(focusRequest.current)?.focus({ preventScroll: true });
    focusRequest.current = null;
  }, [selectedId, tab]);
  function openConversation(friendId: string) { focusRequest.current = "chat"; setSelectedId(friendId); setTab("friends"); setConfirmation(null); }
  const refresh = useCallback(async () => {
    const revision = friendRevision.current;
    try { const next = await socialRequest<SocialFriends>("friends", {}, user.id); if (alive.current && revision === friendRevision.current) { setSnapshot(next); setError(null); } }
    catch (cause) { if (alive.current && revision === friendRevision.current) setError(socialErrorCode(cause)); }
  }, [user.id]);
  useEffect(() => {
    alive.current = true;
    let inFlight = false;
    const poll = async () => { if (document.visibilityState === "hidden" || inFlight) return; inFlight = true; await refresh(); inFlight = false; };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    document.addEventListener("visibilitychange", poll);
    return () => { alive.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [refresh]);
  async function logout() {
    setBusy("logout"); setError(null);
    try { await member.logout(); }
    catch (cause) { if (alive.current) { setError(socialErrorCode(cause)); setBusy(null); } }
  }
  async function changeFriend(person: SocialUser, action: FriendAction) {
    setBusy(person.id); setError(null);
    friendRevision.current += 1;
    try {
      const next = await socialRequest<SocialFriends>("friends", { method: "POST", body: JSON.stringify({ userId: person.id, action }) }, user.id);
      if (!alive.current) return;
      setSnapshot(next); setConfirmation(null);
      if (action === "remove") { setSelectedId(null); setDrafts(previous => { const nextDrafts = { ...previous }; delete nextDrafts[person.id]; return nextDrafts; }); }
      if (action === "accept") openConversation(person.id);
    } catch (cause) { if (alive.current) setError(socialErrorCode(cause)); }
    finally { friendRevision.current += 1; if (alive.current) setBusy(null); }
  }
  async function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("search"); setSearchError(null); setResults(null);
    try { const result = await socialRequest<{ users: SocialUser[] }>(`users?q=${encodeURIComponent(search.trim())}`, {}, user.id); if (alive.current) setResults(result.users); }
    catch (cause) { if (alive.current) setSearchError(socialErrorCode(cause)); }
    finally { if (alive.current) setBusy(null); }
  }
  const selected = snapshot?.friends.find(friend => friend.id === selectedId);
  const actionButton = (person: SocialUser, action: FriendAction, label: string) => <button type="button" className="text-button" disabled={busy !== null} onClick={() => void changeFriend(person, action)}>{label}</button>;
  function personRow(person: SocialUser, actions: React.ReactNode) { return <div className="social-person" key={person.id}><Avatar user={person} /><div className="social-person-copy"><strong>{person.displayName}</strong><span>@{person.username}</span></div><div className="social-person-actions">{actions}</div></div>; }
  return <div className="social-member">
    <header className="social-account"><Avatar user={user} /><div className="social-person-copy"><strong>{user.displayName}</strong><span>@{user.username}</span></div><button className="text-button" disabled={busy !== null} onClick={() => void logout()}><LogOut size={18} aria-hidden="true" />{t("退出登录", "Выйти")}</button></header>
    <div className="social-switch material-switch" aria-label={t("好友功能", "Друзья и заявки")}>
      <button type="button" aria-pressed={tab === "friends"} onClick={() => setTab("friends")}><Users size={18} aria-hidden="true" />{t("好友", "Друзья")}{snapshot && <span>{snapshot.friends.length}</span>}</button>
      <button type="button" aria-pressed={tab === "search"} onClick={() => setTab("search")}><UserPlus size={18} aria-hidden="true" />{t("添加好友", "Добавить")}</button>
      <button type="button" aria-pressed={tab === "requests"} onClick={() => setTab("requests")}><Check size={18} aria-hidden="true" />{t("申请", "Заявки")}{snapshot && <span>{snapshot.incoming.length}</span>}</button>
    </div>
    {error && <div className="social-feedback" role="alert"><span>{socialErrorText(error, locale)}</span><button type="button" className="text-button" onClick={() => void refresh()}>{t("刷新", "Обновить")}</button></div>}
    {!snapshot && !error && <p role="status">{t("正在加载好友…", "Загрузка друзей…")}</p>}
    {tab === "search" && <section className="social-discovery"><form onSubmit={find} className="social-search"><label htmlFor="social-search-user">{t("完整用户名或账号昵称", "Полный логин или отображаемое имя")}</label><div><input id="social-search-user" value={search} onChange={event => setSearch(event.target.value)} autoCapitalize="none" spellCheck={false} maxLength={65} placeholder="@username" required /><button type="submit" className="button primary" disabled={busy !== null}><Search size={18} aria-hidden="true" />{t("查找", "Найти")}</button></div></form>
      {searchError && <p className="social-error" role="alert">{socialErrorText(searchError, locale)}</p>}
      {results && <div aria-live="polite">{results.length === 0 ? <p className="social-empty-copy">{t("没有找到，可以让对方复制「好友与聊天」里显示的 @用户名。", "Никого не нашли. Попросите друга скопировать @логин из раздела «Друзья и чат».")}</p> : results.map(person => personRow(person, snapshot?.friends.some(friend => friend.id === person.id) ? <button type="button" className="text-button" onClick={() => openConversation(person.id)}>{t("聊天", "Написать")}</button> : snapshot?.incoming.some(friend => friend.id === person.id) ? actionButton(person, "accept", t("接受申请", "Принять")) : snapshot?.outgoing.some(friend => friend.id === person.id) ? <span className="social-meta">{t("已发送申请", "Заявка отправлена")}</span> : actionButton(person, "request", t("添加好友", "Добавить в друзья"))))}</div>}
    </section>}
    {tab === "requests" && snapshot && <section className="social-discovery"><h3>{t("收到的申请", "Входящие заявки")}</h3>{snapshot.incoming.length ? snapshot.incoming.map(person => personRow(person, <>{actionButton(person, "accept", t("接受", "Принять"))}{actionButton(person, "decline", t("拒绝", "Отклонить"))}</>)) : <p className="social-empty-copy">{t("暂时没有新申请。", "Новых заявок пока нет.")}</p>}<h3>{t("发出的申请", "Отправленные заявки")}</h3>{snapshot.outgoing.length ? snapshot.outgoing.map(person => personRow(person, actionButton(person, "cancel", t("取消申请", "Отменить")))) : <p className="social-empty-copy">{t("没有等待通过的申请。", "Нет ожидающих заявок.")}</p>}</section>}
    {tab === "friends" && snapshot && (snapshot.friends.length ? <div className={`social-chat-layout${selected ? " has-conversation" : ""}`}>
      <nav className="social-friend-list material-glass" aria-label={t("好友列表", "Список друзей")}>{snapshot.friends.map(friend => <button type="button" key={friend.id} ref={element => { if (element) friendButtons.current.set(friend.id, element); else friendButtons.current.delete(friend.id); }} aria-pressed={selectedId === friend.id} onClick={() => openConversation(friend.id)}><Avatar user={friend} /><span className="social-person-copy"><strong>{friend.displayName}</strong><span>@{friend.username}</span></span><MessageCircle size={18} aria-hidden="true" /></button>)}</nav>
      <section className="social-conversation material-glass material-glass--raised" aria-label={t("聊天", "Переписка")}>{selected ? <>
        <header className="social-conversation-header"><button type="button" className="icon-button social-chat-back" aria-label={t("返回好友列表", "Назад к друзьям")} onClick={() => { focusRequest.current = selected.id; setSelectedId(null); }}><ArrowLeft size={20} /></button><div className="social-person-copy"><h3 ref={chatTitle} tabIndex={-1}>{selected.displayName}</h3><span>@{selected.username}</span></div><button type="button" className="text-button" onClick={() => setConfirmation(selected.id)}>{t("移除好友", "Удалить")}</button></header>
        {confirmation === selected.id && <div className="social-feedback"><p>{t("移除后将无法继续聊天。确认移除？", "После удаления переписка станет недоступна. Удалить друга?")}</p>{actionButton(selected, "remove", t("确认移除", "Удалить друга"))}<button type="button" className="text-button" disabled={busy !== null} onClick={() => setConfirmation(null)}>{t("取消", "Отмена")}</button></div>}
        <Conversation key={selected.id} user={user} friend={selected} draft={drafts[selected.id] ?? ""} setDraft={body => setDrafts(previous => ({ ...previous, [selected.id]: body }))} getAttempt={body => { const previous = sendAttempts.current[selected.id]; if (previous?.body !== body) sendAttempts.current[selected.id] = { body, clientId: crypto.randomUUID() }; return sendAttempts.current[selected.id]; }} clearAttempt={() => { delete sendAttempts.current[selected.id]; }} />
      </> : <div className="social-chat-empty"><GuidanceIllustration kind="chat" animated={false} /><p>{t("选择一位好友，开始聊天。", "Выберите друга, чтобы начать разговор.")}</p></div>}</section>
    </div> : <div className="social-chat-empty"><GuidanceIllustration kind="chat" animated={false} /><h3>{t("和朋友，从一句你好开始。", "Дружба начинается с приветствия.")}</h3><button className="button button-sticker" onClick={() => setTab("search")}><UserPlus size={18} aria-hidden="true" />{t("添加第一位好友", "Добавить первого друга")}</button></div>)}
  </div>;
}

function Conversation({ user, friend, draft, setDraft, getAttempt, clearAttempt }: { user: SocialUser; friend: SocialUser; draft: string; setDraft: (value: string) => void; getAttempt: (body: string) => { body: string; clientId: string }; clearAttempt: () => void }) {
  const { locale } = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const id = useId();
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [olderBusy, setOlderBusy] = useState(false);
  const alive = useRef(true);
  const initialized = useRef(false);
  const newestMessage = useRef<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const scrollMode = useRef<"bottom" | { height: number; top: number } | null>("bottom");
  const merge = useCallback((incoming: SocialMessage[]) => setMessages(previous => [...new Map([...previous, ...incoming].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id)), []);
  const refresh = useCallback(async () => {
    try {
      const result = await socialRequest<SocialMessages>(`messages?friendId=${encodeURIComponent(friend.id)}`, {}, user.id);
      if (!alive.current) return;
      const element = scroller.current;
      if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 80) scrollMode.current = "bottom";
      if (!initialized.current) { setHasMore(result.hasMore); initialized.current = true; }
      // After a long absence, start from the latest contiguous page. Older history
      // remains reachable through its proper cursor instead of merging across a gap.
      if (result.messages.length === 50 && newestMessage.current !== null && result.messages[0].id > newestMessage.current) {
        setMessages(result.messages); setHasMore(result.hasMore); scrollMode.current = "bottom";
      } else merge(result.messages);
      if (result.messages.length) newestMessage.current = result.messages.at(-1)!.id;
      setLoaded(true); setError(null);
    } catch (cause) { if (alive.current) setError(socialErrorCode(cause)); }
  }, [friend.id, user.id, merge]);
  useEffect(() => {
    alive.current = true;
    let inFlight = false;
    const poll = async () => { if (document.visibilityState === "hidden" || inFlight) return; inFlight = true; await refresh(); inFlight = false; };
    void poll(); const timer = window.setInterval(() => void poll(), 5000);
    document.addEventListener("visibilitychange", poll);
    return () => { alive.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [refresh]);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || !scrollMode.current) return;
    element.scrollTop = scrollMode.current === "bottom" ? element.scrollHeight : scrollMode.current.top + element.scrollHeight - scrollMode.current.height;
    scrollMode.current = null;
  }, [messages]);
  async function older() {
    if (!messages.length || olderBusy) return;
    setOlderBusy(true); setError(null);
    try {
      const result = await socialRequest<SocialMessages>(`messages?friendId=${encodeURIComponent(friend.id)}&before=${messages[0].id}`, {}, user.id);
      if (!alive.current) return;
      const element = scroller.current;
      if (element) scrollMode.current = { height: element.scrollHeight, top: element.scrollTop };
      merge(result.messages); setHasMore(result.hasMore);
    } catch (cause) { if (alive.current) setError(socialErrorCode(cause)); }
    finally { if (alive.current) setOlderBusy(false); }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = draft.trim();
    if (!body || sending) return;
    setSending(true); setSendError(null);
    const attempt = getAttempt(body);
    try {
      const result = await socialRequest<{ message: SocialMessage }>("messages", { method: "POST", body: JSON.stringify({ friendId: friend.id, ...attempt }) }, user.id);
      if (!alive.current) return;
      scrollMode.current = "bottom"; merge([result.message]); setDraft(""); clearAttempt();
    } catch (cause) { if (alive.current) setSendError(socialErrorCode(cause)); }
    finally { if (alive.current) setSending(false); }
  }
  return <>
    {error && <div className="social-feedback" role="alert"><span>{socialErrorText(error, locale)}</span><button className="text-button" onClick={() => void refresh()}>{t("重试", "Повторить")}</button></div>}
    <div ref={scroller} className="social-message-scroll" tabIndex={0} aria-label={t("聊天记录", "История переписки")}>
      {hasMore && <button type="button" className="text-button social-older" disabled={olderBusy} onClick={() => void older()}>{olderBusy ? t("正在加载…", "Загрузка…") : t("查看更早的消息", "Более ранние сообщения")}</button>}
      {!loaded && !error && <p role="status">{t("正在读取消息…", "Загрузка сообщений…")}</p>}
      {loaded && !messages.length && <p className="social-empty-copy">{t("还没有消息，打个招呼吧。", "Сообщений пока нет. Поздоровайтесь!")}</p>}
      <ol className="social-messages" aria-live="polite" aria-relevant="additions" aria-label={t("消息", "Сообщения")}>{messages.map(message => <li key={message.id} className={message.senderId === user.id ? "is-own" : ""}><span className="sr-only">{message.senderId === user.id ? t("我", "Я") : friend.displayName}</span><p dir="auto">{message.body}</p><time dateTime={new Date(message.createdAt).toISOString()}>{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "ru-RU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time></li>)}</ol>
    </div>
    <form className="social-compose" onSubmit={send}><label htmlFor={`${id}-message`}>{t("发送消息", "Написать сообщение")}</label><textarea id={`${id}-message`} rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} disabled={sending} /><div><span className="social-meta">{draft.length}/2000</span><button className="button primary" type="submit" disabled={sending || !draft.trim()}><Send size={18} aria-hidden="true" />{sending ? t("发送中…", "Отправка…") : sendError ? t("重新发送", "Повторить отправку") : t("发送", "Отправить")}</button></div>{sendError && <p className="social-error" role="alert">{socialErrorText(sendError, locale)}</p>}<span className="sr-only" role="status">{sending ? t("正在发送消息", "Отправка сообщения") : ""}</span></form>
  </>;
}
