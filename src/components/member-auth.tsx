"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { GuidanceIllustration } from "@/components/guidance-illustration";
import { useHomeState } from "@/lib/home-store";
import { socialErrorCode, socialErrorText } from "@/lib/social-client";
import { useMemberSession, type MemberSession } from "@/components/member-session";
import "@/app/social.css";
import "@/app/account-center.css";

export function MemberAuth({ initialMode = "login", compact = false, onAuthenticated }: { initialMode?: "login" | "register"; compact?: boolean; onAuthenticated?: (session: MemberSession) => void }) {
  const member = useMemberSession();
  const router = useRouter();
  const { locale } = useHomeState();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const id = useId();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const result = await member.authenticate(mode, { username, password, ...(mode === "register" ? { displayName } : {}) });
      setPassword("");
      if (onAuthenticated) onAuthenticated(result);
      else if (!result.profile) router.push("/onboarding");
    } catch (cause) { setError(socialErrorCode(cause)); } finally { setBusy(false); }
  }
  return <div className={`social-auth${compact ? " member-auth-compact" : ""}`}>
    {!compact && <div className="social-auth-intro"><GuidanceIllustration kind="chat" /><h3>{t("欢迎来到 StudentPath。", "Добро пожаловать в StudentPath.")}</h3><p>{t("一个账号，继续你的留学旅程。", "Один аккаунт для вашей студенческой жизни.")}</p></div>}
    <form className="social-auth-form material-glass material-glass--raised" onSubmit={submit}>
      <div className="social-switch material-switch" aria-label={t("账号操作", "Действие с аккаунтом")}><button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(null); }} disabled={busy}>{t("登录", "Войти")}</button><button type="button" aria-pressed={mode === "register"} onClick={() => { setMode("register"); setError(null); }} disabled={busy}>{t("注册", "Регистрация")}</button></div>
      <label htmlFor={`${id}-username`}>{t("用户名", "Имя пользователя")}<input id={`${id}-username`} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,31}" title={t("3–32 位字母、数字、点、下划线或短横线，以字母或数字开头", "3–32 латинских символа, цифры, точка, дефис или подчёркивание; первый символ — буква или цифра")} required value={username} onChange={event => setUsername(event.target.value)} disabled={busy} /></label>
      {mode === "register" && <><p className="social-meta">{t("3–32 位字母、数字、点、下划线或短横线。好友通过它找到你。", "3–32 латинских символа, цифры, точка, дефис или подчёркивание. По этому имени вас найдут друзья.")}</p><label htmlFor={`${id}-name`}>{t("显示昵称", "Отображаемое имя")}<input id={`${id}-name`} name="displayName" autoComplete="nickname" required maxLength={32} value={displayName} onChange={event => setDisplayName(event.target.value)} disabled={busy} /></label></>}
      <label htmlFor={`${id}-password`}>{t("密码", "Пароль")}</label><div className="social-password"><input id={`${id}-password`} name="password" type={visible ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 10 : undefined} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /><button type="button" className="icon-button" aria-label={visible ? t("隐藏密码", "Скрыть пароль") : t("显示密码", "Показать пароль")} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
      {mode === "register" && <p className="social-meta">{t("密码为 10–128 个字符。", "Пароль: от 10 до 128 символов.")}</p>}
      {error && <p className="social-error" role="alert">{socialErrorText(error, locale)}</p>}
      <button className="button button-sticker" type="submit" disabled={busy}>{busy ? t("请稍候…", "Подождите…") : mode === "login" ? t("登录", "Войти") : t("注册并继续", "Создать аккаунт и продолжить")}</button>
    </form>
  </div>;
}

