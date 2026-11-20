"use client";

import { useState } from "react";
import { useMemberSession } from "@/components/member-session";
import { MemberAuth } from "@/components/member-auth";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { PlanSyncFeedback } from "@/components/plan-sync-feedback";
import Link from "next/link";
import { Check, ListPlus } from "lucide-react";
import type { EditorialDocument } from "@/data/editorial-content";
import { useHomeState } from "@/lib/home-store";
import { addDocumentToPlan, usePersonalPlan } from "@/lib/personal-plan-store";
import "@/app/personal-plan-action.css";

export function AddToPersonalPlan({ document, disabled = false, onOpenPersonal }: { document: EditorialDocument; disabled?: boolean; onOpenPersonal?: () => void }) {
  const { locale } = useHomeState();
  const plan = usePersonalPlan();
  const member = useMemberSession();
  const [login, setLogin] = useState(false);
  const added = plan.groups.some(group => group.sourceId === document.id);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <div className="personal-plan-action">
    <div className="personal-plan-action-controls">
      <button className="button primary button-sticker" type="button" disabled={disabled || !member.loaded || Boolean(member.user && (!plan.hydrated || plan.saving))} aria-disabled={added || undefined} onClick={() => { if (!member.user) setLogin(true); else if (!added) void addDocumentToPlan(document); }}>
        {added ? <Check size={19} /> : <ListPlus size={19} />}
        <span>{!member.user && member.loaded ? t("登录后加入清单", "Войти и добавить в список") : added ? t("已加入我的清单", "В моём списке") : t("加入我的清单", "Добавить в мой список")}</span>
      </button>
      {added && <Link className="button secondary material-glass" href="/me" onClick={onOpenPersonal}>{t("去个人中心", "К моим делам")}</Link>}
    </div>
    <span className="sr-only" role="status">{added ? t("已加入，可在个人中心安排任务与日期。", "Добавлено. Задачи и даты доступны в личном разделе.") : ""}</span>
    <PlanSyncFeedback plan={plan} locale={locale} />
    <WorkspaceDialog open={login && !member.user} onClose={() => setLogin(false)} title={t("登录后加入清单", "Войти и добавить в список")}><MemberAuth compact onAuthenticated={() => setLogin(false)} /></WorkspaceDialog>
  </div>;
}
