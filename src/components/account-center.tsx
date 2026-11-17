"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AccountPanel } from "@/components/admin-page";
import { MemberAuth } from "@/components/member-auth";
import { MemberLogout } from "@/components/member-logout";
import { useMemberSession } from "@/components/member-session";
import { socialErrorText } from "@/lib/social-client";
import { useHomeState } from "@/lib/home-store";
import { useCommunityRemoteState } from "@/lib/community-remote-store";
import "@/app/account-center.css";

export function AccountCenter({ mode, onModeChange }: { mode: "member" | "admin"; onModeChange: (mode: "member" | "admin") => void }) {
  const { locale } = useHomeState();
  const { session } = useCommunityRemoteState();
  const center = useRef<HTMLDivElement>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  useEffect(() => {
    const body = center.current?.closest(".workspace-dialog-body");
    if (body) body.scrollTop = 0;
  }, [mode]);
  return <div ref={center} className="account-center">
    <div className="social-switch material-switch" role="group" aria-label={t("账号类型", "Тип аккаунта")}>
      <button type="button" aria-pressed={mode === "member"} onClick={() => onModeChange("member")}>{t("会员账号", "Аккаунт участника")}</button>
      <button type="button" aria-pressed={mode === "admin"} onClick={() => onModeChange("admin")}><ShieldCheck size={20} aria-hidden="true" />{session?.authenticated ? t("站点管理", "Управление сайтом") : t("管理员登录", "Вход администратора")}</button>
    </div>
    {mode === "admin" ? <div className="personal-account-dialog"><AccountPanel /></div> : <MemberAccount />}
  </div>;
}

function MemberAccount() {
  const { locale } = useHomeState();
  const member = useMemberSession();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <div className="account-center">
    {!member.loaded ? <p role="status">{t("正在读取账号…", "Загрузка аккаунта…")}</p> : member.user ? <section className="member-account-summary">
      <h3>{member.user.displayName}</h3><p>@{member.user.username}</p>
      <Link href="/onboarding" className="button secondary">{member.profile ? t("修改个人情况", "Изменить профиль") : t("继续完善个人情况", "Заполнить профиль")}</Link>
    </section> : !member.error && <MemberAuth />}
    <MemberLogout />
    {member.error && <div role="alert"><p>{socialErrorText(member.error, locale)}</p><button className="text-button" onClick={() => void member.refresh()}>{t("重试", "Повторить")}</button></div>}
  </div>;
}
