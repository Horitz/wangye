"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useHomeState } from "@/lib/home-store";
import { lockWorkspaceScroll } from "@/lib/workspace-scroll-lock";
import "@/app/workspace-dialog-sizing.css";

const openWorkspaceDialogs: HTMLDialogElement[] = [];

export function WorkspaceDialog({ open, onClose, title, children, variant = "default", headerActions }: { open: boolean; onClose: () => void; title: string; children: ReactNode; variant?: "default" | "guide" | "essentials" | "image"; headerActions?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const backdropPointerDown = useRef(false);
  const [maximized, setMaximized] = useState(false);
  const titleId = useId();
  const { locale } = useHomeState();
  const sizable = variant === "guide" || variant === "image";
  const sizeLabel = locale === "zh" ? (maximized ? "还原窗口" : "放大窗口") : (maximized ? "Восстановить размер окна" : "Развернуть окно");
  const close = () => {
    setMaximized(false);
    dialog.current?.style.removeProperty("width");
    dialog.current?.style.removeProperty("height");
    onClose();
  };
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const workspaceMain = element.closest(".workspace-page")?.querySelector<HTMLElement>("main");
    element.showModal();
    openWorkspaceDialogs.push(element);
    const releaseScroll = lockWorkspaceScroll(document.body.style);
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      const wasTop = openWorkspaceDialogs.at(-1) === element;
      const index = openWorkspaceDialogs.indexOf(element);
      if (index !== -1) openWorkspaceDialogs.splice(index, 1);
      element.close();
      releaseScroll();
      if (!wasTop) return;
      const parent = openWorkspaceDialogs.at(-1);
      if (trigger?.isConnected && (!parent || parent.contains(trigger))) trigger.focus({ preventScroll: true });
      else if (parent) parent.querySelector<HTMLElement>(".workspace-dialog-header button")?.focus({ preventScroll: true });
      else workspaceMain?.focus({ preventScroll: true });
    };
  }, [open]);
  return <dialog ref={dialog} className={`workspace-dialog${variant === "guide" ? " guide-dialog" : variant === "image" ? " guide-image-dialog" : variant === "essentials" ? " essentials-dialog material-glass material-glass--raised" : ""}${sizable ? " workspace-dialog--sizable" : ""}`} data-maximized={sizable && maximized ? "true" : undefined} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }} onPointerDown={event => {
    const rect = event.currentTarget.getBoundingClientRect();
    backdropPointerDown.current = event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const startedOnBackdrop = backdropPointerDown.current;
    backdropPointerDown.current = false;
    if (sizable && !startedOnBackdrop) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  }}>
    <header className={`workspace-dialog-header${variant === "essentials" ? " material-glass" : ""}`}><div><span>StudentPath</span><h2 id={titleId} className={variant === "guide" || variant === "image" ? "sr-only" : undefined}>{title}</h2></div><div className="workspace-dialog-actions">{headerActions}{sizable && <button type="button" className="icon-button workspace-dialog-size-toggle" onClick={() => setMaximized(value => !value)} aria-label={sizeLabel} title={sizeLabel}>{maximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>}<button ref={closeButton} type="button" autoFocus className={`icon-button${variant === "essentials" ? " material-glass material-glass--raised" : ""}`} onClick={close} aria-label={locale === "zh" ? `关闭${title}` : `Закрыть: ${title}`}><X size={22} /></button></div></header>
    {open && <div className="workspace-dialog-body">{children}</div>}
  </dialog>;
}
