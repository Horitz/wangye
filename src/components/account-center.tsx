"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AccountPanel } from "@/components/admin-page";
import { MemberAuth } from "@/components/member-auth";
import { MemberLogout } from "@/components/member-logout";
import { useMemberSession } from "@/components/member-session";
import { socialErrorText } from "@/lib/social-client";
import { useHomeState } from "@/lib/home-store";
import "@/app/account-center.css";

export function AccountCenter() {
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
    <details className="account-administration">
      <summary><ShieldCheck size={20} aria-hidden="true" />{locale === "zh" ? "站点管理" : "Управление сайтом"}</summary>
      <div className="personal-account-dialog"><AccountPanel /></div>
    </details>
  </div>;
}
