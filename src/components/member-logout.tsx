"use client";

import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useMemberSession } from "@/components/member-session";
import { useHomeState } from "@/lib/home-store";
import { socialErrorCode, socialErrorText } from "@/lib/social-client";

export function MemberLogout() {
  const session = useMemberSession();
  const { locale } = useHomeState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const status = useRef<HTMLParagraphElement>(null);
  async function logout(button: HTMLButtonElement) {
    setBusy(true); setError(null);
    try {
      await session.logout(); setDone(true);
      requestAnimationFrame(() => {
        if (document.activeElement === button || document.activeElement === document.body) status.current?.focus();
      });
    } catch (cause) { setError(socialErrorCode(cause)); }
    finally { setBusy(false); }
  }
  return <div className="member-logout">
    {session.user && <button type="button" className="text-button" disabled={busy} onClick={event => void logout(event.currentTarget)}><LogOut size={18} aria-hidden="true" />{locale === "zh" ? busy ? "正在退出…" : "退出登录" : busy ? "Выход…" : "Выйти"}</button>}
    {error && <p role="alert" className="social-error">{socialErrorText(error, locale)}</p>}
    {!session.user && done && <p ref={status} tabIndex={-1} role="status">{locale === "zh" ? "已退出登录。" : "Вы вышли из аккаунта."}</p>}
  </div>;
}
