"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, ChevronDown, Copy, ExternalLink, Pause, Pencil, Play, RefreshCw, Sparkles, X } from "lucide-react";
import { defaultLifeTips, type LifeTip } from "@/data/life-tips";
import { useHomeState, type Locale } from "@/lib/home-store";
import { useCommunityRemoteState } from "@/lib/community-remote-store";
import { formatCalendarDate } from "@/lib/locale-format";
import { LanguageMenu } from "@/components/language-menu";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { LifeTipsEditor, lifeTipCategoryLabel } from "@/components/life-tips-editor";
import { dragonConversation, landmarkLine, type DragonLine, type DragonMood } from "@/data/dragon-dialogue";
import type { DragonLandmark } from "./dragon-landmarks";
import { useCompanionPosition } from "@/components/use-companion-position";
import "@/app/life-tips.css";

function LifeTipsCompanion({ paused, mood, pose, reaction }: { paused: boolean; mood?: DragonMood; pose?: DragonLandmark; reaction: number }) {
  const scene = useRef<HTMLSpanElement>(null);
  const sprite = pose ?? mood;
  const src = sprite ? `/illustrations/dragon-${sprite}.webp` : "/illustrations/life-tips-dragon.png";
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
    <span key={reaction} data-mood={mood} data-pose={pose} className="life-tips-character-reaction"><span className="life-tips-character-motion dragon-sprite" data-sprite={sprite ?? "idle"} style={{ "--sprite-image": `url("${src}")` } as CSSProperties}>
      <span className="dragon-wing dragon-wing--left" /><span className="dragon-wing dragon-wing--right" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={1199} height={1312} decoding="async" draggable={false} />
    </span></span>
    <Sparkles className="life-tips-spark life-tips-spark--first" size={28} />
    <Sparkles className="life-tips-spark life-tips-spark--second" size={20} />
    <span className="life-tips-orbit"><span /></span>
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
  const [mode, setMode] = useState<"closed" | "chat" | "tip" | "auto">("closed");
  const bubbleOpen = mode !== "closed";
  const [line, setLine] = useState<DragonLine | null>(null);
  const [reaction, setReaction] = useState(0);
  const deck = useRef<DragonLine[]>([]);
  const visits = useRef({ coin: 0, castle: 0 });
  const lastTip = useRef("");
  const [motionPaused, setMotionPaused] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState<"all" | LifeTip["category"]>("all");
  const activeRequest = useRef<AbortController | null>(null);
  const editorTrigger = useRef<HTMLButtonElement>(null);
  const dialogContent = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);
  const { field, trigger: companionTrigger, gesture, size, x, y, near, handlers, suppressClick } = useCompanionPosition(speak, () => setMode("closed"), land);
  const bubble = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const bubbleId = useId();
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const currentIndex = Math.max(0, tips.findIndex(tip => tip.id === currentId));
  const current = tips[currentIndex];
  const visibleTips = filter === "all" ? tips : tips.filter(tip => tip.category === filter);

  const load = useCallback(() => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    void fetch("/api/life-tips", { cache: "no-store", signal: controller.signal }).then(async response => {
      const result = await response.json() as { tips?: LifeTip[] };
      if (!response.ok || !Array.isArray(result.tips)) throw new Error("unavailable");
      if (!controller.signal.aborted) { setTips(result.tips); setStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
  }, []);
  useEffect(() => { load(); return () => activeRequest.current?.abort(); }, [load]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setMotionPaused(localStorage.getItem("studentpath:dragon-quiet") === "1"); } catch { /* Optional preference. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function toggleQuiet() {
    setMotionPaused(!motionPaused);
    try { localStorage.setItem("studentpath:dragon-quiet", motionPaused ? "0" : "1"); } catch { /* Optional preference. */ }
  }
  function speak() {
    if (!deck.current.length) deck.current = dragonConversation(line?.mood);
    setLine(deck.current.shift()!);
    setReaction(n => n + 1);
    setMode("chat");
  }
  function land(target: DragonLandmark) {
    setLine(landmarkLine(target, visits.current[target]++));
    setReaction(n => n + 1);
    setMode("chat");
  }
  useEffect(() => {
    if (motionPaused || open || mode !== "closed" || !tips.length) return;
    let timer = 0;
    function schedule() {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        if (gesture.current || document.querySelector("dialog[open]") ||
            document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) {
          schedule();
          return;
        }
        const index = tips.findIndex(tip => tip.id === lastTip.current);
        const next = tips[(index + 1) % tips.length];
        lastTip.current = next.id;
        setCurrentId(next.id);
        setMode("auto");
      }, 60000);
    }
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [mode, motionPaused, open, tips, gesture]);
  useEffect(() => {
    if (mode !== "auto") return;
    const timer = window.setTimeout(() => setMode("closed"), 15000);
    return () => window.clearTimeout(timer);
  }, [mode]);

  function retryLoad() {
    setStatus("loading");
    load();
  }

  useEffect(() => {
    if (!bubbleOpen) return;
    const dismissOutside = (event: Event) => {
      if (dock.current && !event.composedPath().includes(dock.current)) setMode("closed");
    };
    document.addEventListener("click", dismissOutside);
    return () => {
      document.removeEventListener("click", dismissOutside);
    };
  }, [bubbleOpen]);

  function closeBubble() { setMode("closed"); companionTrigger.current?.focus({ preventScroll: true }); }
  function showAll() {
    // The full reader restores focus to the visible character, not the hidden bubble.
    companionTrigger.current?.focus({ preventScroll: true });
    setMode("closed");
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
  const loadNotice = status === "error" ? <div className="life-tips-load-notice" role="status"><span>{t("暂未读取到最新提醒。", "Не удалось загрузить обновления.")}</span><button type="button" className="text-button" onClick={retryLoad}><RefreshCw size={16} />{t("重新加载", "Повторить")}</button></div> : null;

  const { w, h, buttonW, buttonH } = size;
  useEffect(() => {
    const button = companionTrigger.current;
    const drawings = button?.closest(".workspace-page")?.querySelectorAll<HTMLElement>(".ambience-art");
    if (!button || !drawings?.length || !w || !h) return;
    const rect = button.getBoundingClientRect();
    // Watch only the small patch of screen occupied by the pet as the page scrolls.
    const margins = [rect.top, document.documentElement.clientWidth - rect.right, window.innerHeight - rect.bottom, rect.left];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.toggleAttribute("data-behind-companion", entry.isIntersecting);
    }, { rootMargin: margins.map(value => `${8 - Math.round(value)}px`).join(" ") });
    drawings.forEach(drawing => observer.observe(drawing));
    return () => { observer.disconnect(); drawings.forEach(drawing => drawing.removeAttribute("data-behind-companion")); };
  }, [companionTrigger, w, h, x, y, buttonW, buttonH]);
  const gap = 10;
  const above = y > h - y - buttonH;
  const bubbleWidth = Math.min(w, locale === "zh" ? 320 : 360);
  const center = x + buttonW / 2;
  const bubbleLeft = Math.max(0, Math.min(center - bubbleWidth / 2, w - bubbleWidth));
  const bubbleStyle: CSSProperties & { "--life-tips-bubble-origin": string } = {
    left: bubbleLeft, width: bubbleWidth, maxHeight: Math.max(0, (above ? y : h - y - buttonH) - gap),
    ...(above ? { bottom: h - y + gap } : { top: y + buttonH + gap }),
    "--life-tips-bubble-origin": `${Math.min(bubbleWidth - 16, Math.max(16, center - bubbleLeft))}px`,
  };
  return <>
    <div className="life-tips-field" data-near={near ?? undefined} ref={field}><aside ref={dock} className="life-tips-dock" aria-label={t("龙娘生活提醒", "Дракончик с подсказками")} onKeyDown={event => {
      if (event.key === "Escape" && bubbleOpen) { event.preventDefault(); event.stopPropagation(); closeBubble(); }
    }}>
      <button ref={companionTrigger} type="button" className="life-tips-companion-trigger" style={w ? { left: x, top: y } : undefined} {...handlers} aria-expanded={bubbleOpen} aria-controls={bubbleId} aria-haspopup="dialog" aria-label={t("和龙娘聊聊，可拖动或用方向键移到金币和城堡", "Поговорить с дракошей. Перетащите её к монете или замку либо используйте стрелки")} onClick={event => {
        if (event.detail && suppressClick.current) return;
        speak();
      }}>
        <LifeTipsCompanion paused={motionPaused} mood={mode === "chat" ? line?.mood : undefined} pose={mode === "chat" ? line?.scene : undefined} reaction={reaction} />
      </button>
      <div ref={bubble} id={bubbleId} style={bubbleStyle} data-above={above} className="life-tips-bubble material-glass material-glass--raised" hidden={!bubbleOpen} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby={headingId} onPointerEnter={() => { if (mode === "auto") setMode("tip"); }} onFocusCapture={() => { if (mode === "auto") setMode("tip"); }}>
        <div className="life-tips-bubble-heading"><h2 id={headingId}>{mode === "chat" ? t("龙娘", "Дракоша") : t("生活小提醒", "Полезные мелочи")}</h2><div className="life-tips-bubble-tools">
          <button type="button" className="icon-button life-tips-motion-toggle" aria-pressed={motionPaused} onClick={toggleQuiet} title={t("暂停自动提醒和动画", "Приостановить подсказки и анимацию")} aria-label={t("暂停自动提醒和动画", "Приостановить подсказки и анимацию")}>{motionPaused ? <Play size={18} /> : <Pause size={18} />}</button>
          <button type="button" className="icon-button" onClick={closeBubble} aria-label={t("收起提醒", "Закрыть подсказку")}><X size={20} /></button>
        </div></div>
        <div className="life-tips-bubble-body">
          {mode === "chat" && line ? <p className="dragon-line" role="status">{line[locale]}</p> : current ? <div className="life-tips-current" aria-live="polite" aria-atomic="true"><span className="life-tip-category">{lifeTipCategoryLabel(current.category, locale)}</span><h3>{current.title[locale]}</h3><p>{current.body[locale]}</p></div> : <p className="life-tips-empty">{t("暂时没有生活提醒。", "Подсказок пока нет.")}</p>}
          <div className="life-tips-panel-actions">
            {tips.length > 0 && (mode === "chat" || tips.length > 1) && <button type="button" className="button secondary material-glass" onClick={() => {
              if (mode !== "chat") setCurrentId(tips[(currentIndex + 1) % tips.length].id);
              setMode("tip");
            }}>{mode === "chat" ? t("生活提醒", "Подсказка") : t("换一条", "Ещё подсказка")}<ArrowRight size={16} /></button>}
            <button type="button" className="text-button" aria-haspopup="dialog" onClick={showAll}>{t("查看全部", "Все подсказки")}<ArrowRight size={18} /></button>
          </div>
          {status === "loading" && <span className="sr-only" role="status">{t("正在更新生活提醒…", "Обновляем подсказки…")}</span>}
          {loadNotice}
        </div>
      </div>
    </aside></div>
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
