"use client";

import { useId, useState } from "react";
import { FileText } from "lucide-react";
import type { Locale } from "@/lib/home-store";

/** An annotated planning sketch, deliberately not a replica of an official document. */
export function GuideDocumentExample({ kind, locale, annotation }: { kind: "checklist" | "reply" | "result"; locale: Locale; annotation: string }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const labels = kind === "checklist"
    ? [t("清单来源", "Источник списка"), t("材料名称", "Название документа"), t("提交形式", "Форма подачи")]
    : kind === "reply"
      ? [t("回复来自谁", "Кто ответил"), t("已确认事项", "Что подтверждено"), t("待追问的问题", "Что ещё уточнить")]
      : [t("结果名称", "Название результата"), t("需要核对的内容", "Что проверить"), t("后续安排", "Следующие действия")];
  const explanations = kind === "checklist"
    ? [t("记下清单来自哪个负责部门，以及收到的日期。", "Запишите подразделение, приславшее список, и дату ответа."), t("按部门回复保留材料原名，遇到不理解的名称再询问。", "Сохраните названия из ответа отдела; непонятные названия уточните."), t("分别确认是否需要原件、复印件或电子版，不根据示意图推断。", "Отдельно уточните, нужен ли оригинал, копия или электронная версия." )]
    : kind === "reply"
      ? [t("记录回复部门或官方页面，方便再次核实。", "Запишите подразделение или официальную страницу для повторной проверки."), t("只将明确答复的内容列为已确认。", "Отмечайте подтверждёнными только вопросы с ясным ответом."), t("暂时没有答复的内容单独列出，继续向负责方询问。", "Вопросы без ответа запишите отдельно и уточните у ответственного лица.")]
      : [t("记录实际收到的结果名称，不把这张示意图当作办理凭证。", "Запишите название полученного результата; эта схема не является документом."), t("根据机构说明核对自己的信息，发现问题及时联系负责方。", "Проверьте свои данные по указаниям учреждения; ошибки уточните у ответственного лица."), t("把机构已确认的下一步写下来；没有说明的部分继续核实。", "Запишите согласованные дальнейшие действия; неясное уточните отдельно.")];
  return <figure className="guide-document-example">
    <div className="guide-document-heading"><FileText size={18} aria-hidden="true" /><strong>{t("材料怎么看", "Как читать документы")}</strong><span>{t("点击标注", "Нажмите на метку")}</span></div>
    <div className="guide-document-paper">
      <div className="guide-document-paper-title">{t("我的核对记录", "Моя памятка")}</div>
      {labels.map((label, index) => <button type="button" key={index} className={`guide-document-field${active === index ? " is-active" : ""}`} aria-pressed={active === index} aria-controls={`${id}-explanation`} onClick={() => setActive(index)}><span className="guide-document-marker">{index + 1}</span><span>{label}</span><span className="guide-document-rule" aria-hidden="true" /></button>)}
    </div>
    <div id={`${id}-explanation`} className="guide-document-explanation" aria-live="polite"><strong>{active + 1}. {labels[active]}</strong><p>{explanations[active]}</p></div>
    <figcaption><strong>{t("结构示意 · 非有效文件", "Схема · не действительный документ")}</strong><span>{annotation}</span></figcaption>
  </figure>;
}
