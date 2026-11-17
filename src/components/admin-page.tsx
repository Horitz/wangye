"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, LogOut, RefreshCw, UserRound } from "lucide-react";
import { useHomeState } from "@/lib/home-store";
import { refreshCommunityRemote, useCommunityRemoteState } from "@/lib/community-remote-store";

type Feedback = "credentials" | "rate" | "connection" | "forbidden" | "logout" | null;

export function AccountPanel() {
  const { locale } = useHomeState();
  const remote = useCommunityRemoteState();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const authenticated = remote.session?.authenticated === true;

  function restoreFocus(trigger: Element | null, target: () => HTMLElement | null) {
    requestAnimationFrame(() => {
      if (document.activeElement === document.body || document.activeElement === trigger) target()?.focus({ preventScroll: true });
    });
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trigger = document.activeElement;
    let focusTarget = () => trigger instanceof HTMLElement && trigger.isConnected ? trigger : null;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        setFeedback(response.status === 429 ? "rate" : response.status === 401 ? "credentials" : response.status === 403 ? "forbidden" : "connection");
        if (response.status === 401) focusTarget = () => passwordInput.current;
        return;
      }
      setPassword("");
      setShowPassword(false);
      await refreshCommunityRemote();
      focusTarget = () => heading.current;
    } catch { setFeedback("connection"); }
    finally { setBusy(false); restoreFocus(trigger, focusTarget); }
  }

  async function logout() {
    if (busy) return;
    const trigger = document.activeElement;
    let focusTarget = () => trigger instanceof HTMLElement && trigger.isConnected ? trigger : null;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(10000) });
      if (!response.ok) { setFeedback("connection"); return; }
      setPassword("");
      setShowPassword(false);
      setFeedback("logout");
      await refreshCommunityRemote();
      focusTarget = () => heading.current;
    } catch { setFeedback("connection"); }
    finally { setBusy(false); restoreFocus(trigger, focusTarget); }
  }

  const messages: Record<Exclude<Feedback, null>, string> = {
    credentials: t("账号或密码不正确，请重新输入。", "Неверное имя пользователя или пароль. Попробуйте ещё раз."),
    rate: t("尝试次数较多，请稍后再试。", "Слишком много попыток. Повторите позже."),
    connection: t("暂时无法连接管理服务，请重试。", "Сервис управления недоступен. Попробуйте ещё раз."),
    forbidden: t("当前访问地址不允许登录，请使用本站的本机地址或已配置地址。", "Вход с этого адреса запрещён. Используйте локальный или настроенный адрес сайта."),
    logout: t("已退出账号。", "Вы вышли из аккаунта."),
  };

  return <section className="account-panel" id="account" aria-labelledby="account-heading">
    <header className="account-heading"><span className="admin-symbol" aria-hidden="true"><UserRound size={28} strokeWidth={1.75} /></span><h2 id="account-heading" ref={heading} tabIndex={-1}>{t("管理员账号", "Аккаунт администратора")}</h2></header>
    <div className="account-content">
    {remote.sessionError ? <section className="workspace-panel admin-card"><p role="alert">{t("暂时无法确认登录状态，请重试。", "Не удалось проверить вход. Попробуйте ещё раз.")}</p><button className="button secondary" onClick={() => void refreshCommunityRemote()}><RefreshCw size={18} />{t("重新连接", "Подключиться снова")}</button></section>
      : !remote.session ? <p role="status">{t("正在连接管理服务…", "Подключаемся к сервису управления…")}</p>
      : authenticated ? <section className="workspace-panel admin-card">
        <div className="admin-identity"><span aria-hidden="true"><Check size={22} /></span><div><h3>{remote.session.username}</h3><p>{t("已登录 · 管理员", "Вы вошли · Администратор")}</p></div></div>
        <Link href="/explore" className="button primary">{t("编辑办事指南", "Редактировать инструкции")}<ArrowRight size={18} /></Link>
        <Link href="/community" className="button secondary">{t("管理社区精选", "Управлять подборкой")}<ArrowRight size={18} /></Link>
        <button className="button secondary" onClick={() => void logout()} disabled={busy}><LogOut size={18} />{busy ? t("正在退出…", "Выходим…") : t("退出账号", "Выйти из аккаунта")}</button>
      </section>
      : !remote.session.configured ? <section className="workspace-panel admin-card">
        <h3>{t("账号登录", "Вход в аккаунт")}</h3>
        <p>{t("管理账号尚未配置，请联系网站维护者。", "Аккаунт администратора ещё не настроен. Свяжитесь с владельцем сайта.")}</p>
        <button className="button secondary" onClick={() => void refreshCommunityRemote()}><RefreshCw size={18} />{t("刷新登录状态", "Обновить статус входа")}</button>
      </section>
      : <form className="workspace-panel admin-card" onSubmit={login} aria-busy={busy}>
        <h3>{t("账号登录", "Вход в аккаунт")}</h3>
        <label className="admin-field">{t("账号", "Имя пользователя")}<input name="username" autoComplete="username" required maxLength={64} value={username} onChange={event => setUsername(event.target.value)} disabled={busy} autoCapitalize="none" spellCheck={false} /></label>
        <label className="admin-field" htmlFor="admin-password">{t("密码", "Пароль")}</label>
        <div className="admin-password"><input ref={passwordInput} id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /><button className="icon-button" type="button" aria-label={showPassword ? t("隐藏密码", "Скрыть пароль") : t("显示密码", "Показать пароль")} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
        <button className="button primary" type="submit" disabled={busy}><KeyRound size={18} />{busy ? t("正在登录…", "Входим…") : t("登录", "Войти")}</button>
        <details className="admin-recovery"><summary>{t("忘记密码？", "Забыли пароль?")}</summary><p>{t("请联系网站维护者重设密码。重设后，该账号已登录的会话将退出。", "Обратитесь к владельцу сайта для сброса пароля. После сброса все сеансы этого аккаунта завершатся.")}</p></details>
      </form>}
    {feedback && <p className={`admin-feedback${feedback === "logout" ? " is-success" : ""}`} role={feedback === "logout" ? "status" : "alert"}>{messages[feedback]}</p>}
    </div>
  </section>;
}
