"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Copy, ExternalLink, MessageCircle, Pause, Pencil, Play, RefreshCw, Sparkles, X } from "lucide-react";
import { defaultLifeTips, type LifeTip } from "@/data/life-tips";
import { useHomeState, type Locale } from "@/lib/home-store";
import { useCommunityRemoteState } from "@/lib/community-remote-store";
import { formatCalendarDate } from "@/lib/locale-format";
import { LanguageMenu } from "@/components/language-menu";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { LifeTipsEditor, lifeTipCategoryLabel } from "@/components/life-tips-editor";
import "@/app/life-tips.css";

function LifeTipsCompanion({ paused }: { paused: boolean }) {
  const scene = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => { element.dataset.motion = visible && document.visibilityState === "visible" && !preference.matches ? "running" : "paused"; };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer?.observe(element);
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer?.disconnect();
      element.dataset.motion = "paused";
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <span ref={scene} className="life-tips-companion" data-motion="paused" data-user-paused={paused} aria-hidden="true">
    <span className="life-tips-character-reaction"><span className="life-tips-character-motion">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/illustrations/life-tips-dragon.png" alt="" width={1199} height={1312} decoding="async" draggable={false} />
    </span></span>
    <Sparkles className="life-tips-spark life-tips-spark--first" size={28} />
    <Sparkles className="life-tips-spark life-tips-spark--second" size={20} />
    <span className="life-tips-orbit"><span /></span>
    <span className="life-tips-chat-mark"><MessageCircle size={22} /></span>
    <span className="life-tips-character-shadow" />
  </span>;
}

function TipExample({ text, locale }: { text: string; locale: Locale }) {
  const [copied, setCopied] = useState<"idle" | "success" | "error">("idle");
  const [copying, setCopying] = useState(false);
  const request = useRef(0);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const textLanguage = /[\u3400-\u4dbf\u4e00-\u9fff]/.test(text) ? "zh-CN" : /[а-яё]/i.test(text) ? "ru" : locale === "zh" ? "zh-CN" : "ru";
  useEffect(() => () => { request.current += 1; }, []);
  async function copy() {
    const current = ++request.current;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      if (request.current === current) setCopied("success");
    } catch { if (request.current === current) setCopied("error"); }
    finally { if (request.current === current) setCopying(false); }
  }
  return <div className="life-tip-example">
    <div className="life-tip-example-heading"><strong>{t("可以这样说", "Можно написать так")}</strong><button type="button" className="button secondary" disabled={copying} onClick={() => void copy()}>{copied === "success" ? <Check size={18} /> : <Copy size={18} />}{copying ? t("正在复制…", "Копирование…") : copied === "success" ? t("已复制", "Скопировано") : t("复制示例", "Копировать пример")}</button></div>
    <pre lang={textLanguage}>{text}</pre>
    {copied !== "idle" && <p className={`life-tip-copy-status${copied === "error" ? " life-tip-copy-status--error" : ""}`} role="status">{copied === "success" ? t("示例已复制。", "Пример скопирован.") : t("没能复制，请选中文字后手动复制。", "Не удалось скопировать. Выделите текст и скопируйте вручную.")}</p>}
  </div>;
}

function TipSources({ tip, locale }: { tip: LifeTip; locale: Locale }) {
  if (!tip.sources.length && !tip.verifiedAt) return null;
  return <details className="life-tip-sources"><summary><span>{locale === "zh" ? "查看来源" : "Источники"}</span><ChevronDown size={18} /></summary>
    {tip.sources.length > 0 && <ul>{tip.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label[locale]}<ExternalLink size={15} aria-hidden="true" /></a></li>)}</ul>}
    {tip.verifiedAt && <p className="life-tip-verification">{locale === "zh" ? "核实于 " : "Проверено "}<time dateTime={tip.verifiedAt}>{formatCalendarDate(tip.verifiedAt, locale)}</time></p>}
  </details>;
}

export function LifeTipsCompanionDock() {
  const { locale } = useHomeState();
  const remote = useCommunityRemoteState();
  const isAdmin = remote.sessionStatus === "ready" && Boolean(remote.session?.authenticated);
  const [tips, setTips] = useState<LifeTip[]>(defaultLifeTips);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [currentId, setCurrentId] = useState(defaultLifeTips[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState<"all" | LifeTip["category"]>("all");
  const activeRequest = useRef<AbortController | null>(null);
  const editorTrigger = useRef<HTMLButtonElement>(null);
  const dialogContent = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);
  const companionTrigger = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const bubbleId = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const currentIndex = Math.max(0, tips.findIndex(tip => tip.id === currentId));
  const current = tips[currentIndex];
  const visibleTips = filter === "all" ? tips : tips.filter(tip => tip.category === filter);

  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStatus("loading");
    try {
      const response = await fetch("/api/life-tips", { cache: "no-store", signal: controller.signal });
      const result = await response.json() as { tips?: LifeTip[] };
      if (!response.ok || !Array.isArray(result.tips)) throw new Error("unavailable");
      if (!controller.signal.aborted) { setTips(result.tips); setStatus("ready"); }
    } catch { if (!controller.signal.aborted) setStatus("error"); }
  }, []);
  useEffect(() => { void load(); return () => activeRequest.current?.abort(); }, [load]);

  useEffect(() => {
    if (!bubbleOpen) return;
    bubble.current?.focus({ preventScroll: true });
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !dock.current?.contains(event.target)) setBubbleOpen(false);
    };
    // Let an outside control finish its click before the in-flow bubble collapses.
    document.addEventListener("click", dismissOutside);
    return () => {
      document.removeEventListener("click", dismissOutside);
    };
  }, [bubbleOpen]);

  function closeBubble() { setBubbleOpen(false); companionTrigger.current?.focus({ preventScroll: true }); }
  function showAll() {
    // The full reader restores focus to the visible character, not the hidden bubble.
    companionTrigger.current?.focus({ preventScroll: true });
    setBubbleOpen(false);
    setSaved(false);
    setOpen(true);
  }
  function returnToReading() {
    setEditing(false);
    requestAnimationFrame(() => {
      const body = dialogContent.current?.closest(".workspace-dialog-body");
      if (body) body.scrollTop = 0;
      (editorTrigger.current && !editorTrigger.current.disabled ? editorTrigger.current : dialogContent.current)?.focus({ preventScroll: true });
    });
  }
  async function save(next: LifeTip[]) {
    const response = await fetch("/api/life-tips", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tips: next }) });
    const result = await response.json() as { tips?: LifeTip[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "unavailable");
    if (!Array.isArray(result.tips)) throw new Error("unavailable");
    setTips(result.tips);
    setStatus("ready");
    setSaved(true);
    returnToReading();
  }
  const loadNotice = status === "error" ? <div className="life-tips-load-notice" role="status"><span>{t("暂未读取到最新提醒。", "Не удалось загрузить обновления.")}</span><button type="button" className="text-button" onClick={() => void load()}><RefreshCw size={16} />{t("重新加载", "Повторить")}</button></div> : null;

  return <>
    <aside ref={dock} className="life-tips-dock" aria-label={t("龙娘生活提醒", "Дракончик с подсказками")} onKeyDown={event => {
      if (event.key === "Escape" && bubbleOpen) { event.preventDefault(); event.stopPropagation(); closeBubble(); }
    }}>
      <button ref={companionTrigger} type="button" className="life-tips-companion-trigger" aria-expanded={bubbleOpen} aria-controls={bubbleId} aria-haspopup="dialog" aria-label={bubbleOpen ? t("收起龙娘的提醒", "Скрыть подсказку дракончика") : t("和龙娘聊聊生活小提醒", "Открыть подсказку дракончика")} onClick={() => setBubbleOpen(value => !value)}>
        <LifeTipsCompanion paused={motionPaused} />
        <span className="life-tips-trigger-label">{t("生活小提醒", "Подсказки")}</span>
      </button>
      <div ref={bubble} id={bubbleId} className="life-tips-bubble material-glass material-glass--raised" hidden={!bubbleOpen} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby={headingId}>
        <div className="life-tips-bubble-heading"><h2 id={headingId}>{t("生活小提醒", "Полезные мелочи")}</h2><div className="life-tips-bubble-tools">
          <button type="button" className="icon-button life-tips-motion-toggle" aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)} title={t("暂停动画", "Пауза анимации")} aria-label={t("暂停动画", "Пауза анимации")}>{motionPaused ? <Play size={18} /> : <Pause size={18} />}</button>
          <button type="button" className="icon-button" onClick={closeBubble} aria-label={t("收起提醒", "Закрыть подсказку")}><X size={20} /></button>
        </div></div>
        <div className="life-tips-bubble-body">
          {current ? <div className="life-tips-current" aria-live="polite" aria-atomic="true"><span className="life-tip-category">{lifeTipCategoryLabel(current.category, locale)}</span><h3>{current.title[locale]}</h3><p>{current.body[locale]}</p></div> : <p className="life-tips-empty">{t("暂时没有生活提醒。", "Подсказок пока нет.")}</p>}
          <div className="life-tips-panel-actions">
            {tips.length > 1 && <button type="button" className="button secondary material-glass" onClick={() => setCurrentId(tips[(currentIndex + 1) % tips.length].id)}>{t("换一条", "Следующая подсказка")}<ArrowRight size={18} /></button>}
            <button type="button" className="text-button" aria-haspopup="dialog" onClick={showAll}>{t("查看全部", "Все подсказки")}<ArrowRight size={18} /></button>
          </div>
          {status === "loading" && <span className="sr-only" role="status">{t("正在更新生活提醒…", "Обновляем подсказки…")}</span>}
          {loadNotice}
        </div>
      </div>
    </aside>
    <WorkspaceDialog open={open} onClose={() => { setOpen(false); setEditing(false); }} variant="essentials" title={editing ? t("编辑生活小提醒", "Редактировать подсказки") : t("生活小提醒", "Полезные мелочи")} headerActions={<LanguageMenu tone="light" />}>
      {editing ? <LifeTipsEditor tips={tips} locale={locale} canSave={isAdmin} onSave={save} onCancel={returnToReading} /> : <div ref={dialogContent} className="life-tips-dialog-content" tabIndex={-1} role="region" aria-label={t("生活提醒内容", "Тексты подсказок")}>
        <div className="life-tips-dialog-toolbar">
          <div className="life-tips-filters material-switch" role="group" aria-label={t("提醒分类", "Категории подсказок")}>
            {(["all", "etiquette", "venue", "rule"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? t("全部", "Все") : lifeTipCategoryLabel(value, locale)}</button>)}
          </div>
          {isAdmin && <button ref={editorTrigger} type="button" className="button secondary material-glass" disabled={status !== "ready"} onClick={() => { setSaved(false); setEditing(true); }}><Pencil size={18} />{t("编辑提醒", "Редактировать")}</button>}
        </div>
        {saved && <p className="life-tips-save-status" role="status">{t("生活提醒已保存。", "Подсказки сохранены.")}</p>}
        {status === "loading" && <p className="life-tips-load-status" role="status">{t("正在更新提醒…", "Обновляем подсказки…")}</p>}
        {loadNotice}
        <div className="life-tips-list">
          {visibleTips.map(tip => <article key={tip.id} className="life-tip-card material-glass material-glass--raised">
            <span className="life-tip-category">{lifeTipCategoryLabel(tip.category, locale)}</span><h3>{tip.title[locale]}</h3><p>{tip.body[locale]}</p>
            {tip.example?.[locale] && <TipExample key={`${tip.id}-${locale}`} text={tip.example[locale]} locale={locale} />}
            <TipSources tip={tip} locale={locale} />
          </article>)}
          {!visibleTips.length && <p className="life-tips-empty">{t("这个分类还没有提醒。", "В этой категории пока нет подсказок.")}</p>}
        </div>
      </div>}
    </WorkspaceDialog>
  </>;
}
