"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type GlassSelectOption = { value: string; label: string; disabled?: boolean; lang?: string };
export type GlassSelectProps = {
  value: string;
  options: GlassSelectOption[];
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  id?: string;
  icon?: ReactNode;
  className?: string;
  iconOnly?: boolean;
  align?: "start" | "end";
  tone?: "light" | "dark";
};

/** A select-only combobox. Its inline popover also works inside a modal dialog. */
export function GlassSelect({ value, options, onChange, label, ariaLabel, disabled = false, id, icon, className = "", iconOnly = false, align = "start", tone = "light" }: GlassSelectProps) {
  const generatedId = useId();
  const controlId = id ?? `glass-select-${generatedId}`;
  const listId = `${controlId}-list`;
  const labelId = `${controlId}-label`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const selected = options.find(option => option.value === value);
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  const isDisabled = disabled || enabled.length === 0;
  const expanded = open && !isDisabled;

  const close = (restoreFocus = false) => {
    setOpen(false);
    typed.current = { text: "", at: 0 };
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const show = (edge?: "first" | "last") => {
    if (isDisabled) return;
    const current = options.findIndex(option => option.value === value && !option.disabled);
    setActive(edge === "first" ? enabled[0] : edge === "last" ? enabled[enabled.length - 1] : current >= 0 ? current : enabled[0]);
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close(true);
  };

  useLayoutEffect(() => {
    if (!expanded) return;
    const element = panel.current;
    const button = trigger.current;
    if (!element || !button) return;
    const position = () => {
      const rect = button.getBoundingClientRect();
      const styles = getComputedStyle(element);
      const inset = parseFloat(styles.getPropertyValue("--glass-viewport-inset")) || 12;
      const gap = parseFloat(styles.getPropertyValue("--glass-popup-gap")) || 8;
      const limit = parseFloat(styles.getPropertyValue("--glass-menu-limit")) || 320;
      const iconWidth = parseFloat(styles.getPropertyValue("--glass-icon-menu-width")) || 192;
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const width = Math.min(iconOnly ? Math.max(rect.width, iconWidth) : rect.width, viewportWidth - inset * 2);
      element.style.width = `${Math.max(width, 0)}px`;
      const below = viewportTop + viewportHeight - inset - rect.bottom - gap;
      const above = rect.top - viewportTop - inset - gap;
      const desiredHeight = Math.min(element.scrollHeight, limit);
      const up = below < desiredHeight && above > below;
      const maxHeight = Math.max(0, Math.min(limit, up ? above : below));
      element.style.maxHeight = `${maxHeight}px`;
      const height = Math.min(element.scrollHeight, maxHeight);
      const left = align === "end" ? rect.right - width : rect.left;
      element.style.left = `${Math.max(viewportLeft + inset, Math.min(left, viewportLeft + viewportWidth - width - inset))}px`;
      element.style.top = `${up ? rect.top - gap - height : rect.bottom + gap}px`;
      element.dataset.side = up ? "above" : "below";
    };
    // Keep the popover in this DOM subtree while promoting it above clipping containers.
    // This preserves both inherited theme variables and native dialog modality.
    if (typeof element.showPopover === "function") element.showPopover();
    position();
    const reposition = () => position();
    const observer = new ResizeObserver(reposition);
    observer.observe(button);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
      if (typeof element.hidePopover === "function" && element.matches(":popover-open")) element.hidePopover();
    };
  }, [expanded, align, iconOnly, options]);

  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
        typed.current = { text: "", at: 0 };
      }
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("focusin", dismiss);
    };
  }, [expanded]);

  useLayoutEffect(() => {
    if (!expanded) return;
    const element = panel.current;
    const option = element?.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
    if (!element || !option) return;
    const listRect = element.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.top < listRect.top) element.scrollTop -= listRect.top - optionRect.top;
    else if (optionRect.bottom > listRect.bottom) element.scrollTop += optionRect.bottom - listRect.bottom;
  }, [active, expanded]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    const { key } = event;
    if (key === "Escape" && expanded) { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (key === "Tab") { close(); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
      event.preventDefault();
      if (!expanded) { show(key === "Home" ? "first" : key === "End" ? "last" : undefined); return; }
      const position = enabled.indexOf(active);
      setActive(key === "Home" ? enabled[0] : key === "End" ? enabled[enabled.length - 1] : enabled[(position + (key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length]);
      return;
    }
    const hasRecentPrefix = typed.current.text && Date.now() - typed.current.at < 600;
    if (key === "Enter" || (key === " " && !hasRecentPrefix)) {
      event.preventDefault();
      if (expanded) choose(active); else show();
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      const now = Date.now();
      const previous = now - typed.current.at < 600 ? typed.current.text : "";
      const query = `${previous}${key}`.toLocaleLowerCase();
      typed.current = { text: query, at: now };
      const repeated = [...query].every(character => character === query[0]);
      const search = repeated ? query[0] : query;
      const start = enabled.indexOf(expanded ? active : options.findIndex(option => option.value === value));
      const ordered = [...enabled.slice(start + 1), ...enabled.slice(0, start + 1)];
      const match = ordered.find(index => options[index].label.toLocaleLowerCase().startsWith(search));
      if (!expanded) show();
      if (match !== undefined) setActive(match);
    }
  };

  return <div ref={root} className={`glass-select${iconOnly ? " glass-select--icon" : ""}${expanded ? " is-open" : ""}${className ? ` ${className}` : ""}`} data-tone={tone}>
    {label && <label className="glass-select-label" id={labelId} htmlFor={controlId}>{label}</label>}
    <button ref={trigger} id={controlId} type="button" className="glass-select-trigger" role="combobox" aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? listId : undefined} aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined} aria-labelledby={label && !ariaLabel ? labelId : undefined} aria-label={ariaLabel ?? (!label ? selected?.label : undefined)} disabled={isDisabled} onKeyDown={handleKeyDown} onClick={() => expanded ? close() : show()}>
      {icon && <span className="glass-select-icon" aria-hidden="true">{icon}</span>}
      {!iconOnly && <><span className="glass-select-value" lang={selected?.lang}>{selected?.label ?? value}</span><ChevronDown className="glass-select-chevron" size={18} strokeWidth={1.75} aria-hidden="true" /></>}
      {iconOnly && <span className="sr-only" lang={selected?.lang}>{selected?.label ?? value}</span>}
    </button>
    {expanded && <div ref={panel} id={listId} className="glass-select-panel" popover="manual" role="listbox" aria-labelledby={label && !ariaLabel ? labelId : undefined} aria-label={ariaLabel ?? (!label ? selected?.label : undefined)}>
      {options.map((option, index) => <div key={option.value} id={`${listId}-${index}`} className={`glass-select-option${active === index ? " is-active" : ""}`} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} data-option-index={index} onPointerDown={event => event.preventDefault()} onPointerMove={() => { if (!option.disabled && active !== index) setActive(index); }} onClick={() => choose(index)}><span lang={option.lang}>{option.label}</span><Check className="glass-select-check" size={18} strokeWidth={1.75} aria-hidden="true" /></div>)}
    </div>}
  </div>;
}
