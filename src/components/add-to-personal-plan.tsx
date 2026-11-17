"use client";

import Link from "next/link";
import { Check, ListPlus } from "lucide-react";
import type { EditorialDocument } from "@/data/editorial-content";
import { useHomeState } from "@/lib/home-store";
import { addDocumentToPlan, usePersonalPlan } from "@/lib/personal-plan-store";
import "@/app/personal-plan-action.css";

export function AddToPersonalPlan({ document, disabled = false, onOpenPersonal }: { document: EditorialDocument; disabled?: boolean; onOpenPersonal?: () => void }) {
  const { locale } = useHomeState();
  const plan = usePersonalPlan();
  const added = plan.groups.some(group => group.sourceId === document.id);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  return <div className="personal-plan-action">
    <div className="personal-plan-action-controls">
      <button className="button primary button-sticker" type="button" disabled={disabled || !plan.hydrated} aria-disabled={added || undefined} onClick={() => { if (!added) addDocumentToPlan(document); }}>
        {added ? <Check size={19} /> : <ListPlus size={19} />}
        <span>{added ? t("已加入我的清单", "В моём списке") : t("加入我的清单", "Добавить в мой список")}</span>
      </button>
      {added && <Link className="button secondary material-glass" href="/me" onClick={onOpenPersonal}>{t("去个人中心", "К моим делам")}</Link>}
    </div>
    <span className="sr-only" role="status">{added ? t("已加入，可在个人中心安排任务与日期。", "Добавлено. Задачи и даты доступны в личном разделе.") : ""}</span>
    {plan.storageUnavailable && <p role="status">{t("浏览器无法保存，本次安排仅在当前会话保留。", "Хранилище недоступно. План останется в этом сеансе.")}</p>}
  </div>;
}
