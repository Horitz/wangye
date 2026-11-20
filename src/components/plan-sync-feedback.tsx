import { refreshPersonalPlan, type usePersonalPlan } from "@/lib/personal-plan-store";

export function PlanSyncFeedback({ plan, locale }: { plan: ReturnType<typeof usePersonalPlan>; locale: "zh" | "ru" }) {
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  if (plan.saving) return <p role="status">{t("正在保存…", "Сохраняем…")}</p>;
  if (!plan.error) return null;
  return <div className="personal-plan-retry" role="alert">
    {plan.error === "read" ? <>{t("暂时无法读取账号清单。", "Не удалось загрузить список.")} <button type="button" className="text-button" onClick={() => void refreshPersonalPlan()}>{t("重试", "Повторить")}</button></>
      : plan.error === "conflict" ? t("其他窗口刚更新了清单，已载入最新版。请确认后再保存。", "Список обновлён в другом окне. Проверьте изменения и сохраните снова.")
      : t("保存未确认，请检查清单后重试。", "Сохранение не подтверждено. Проверьте список и попробуйте снова.")}
  </div>;
}
