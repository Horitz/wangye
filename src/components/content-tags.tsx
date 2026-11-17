"use client";

import Link from "next/link";
import { useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { Check, ChevronDown, Hash, Plus, Tags, X } from "lucide-react";
import { MAX_CONTENT_TAGS, MAX_TAG_LENGTH, normalizeTag, normalizeTags, tagKey } from "@/lib/content-tags.mjs";
import { useHomeState, type Locale } from "@/lib/home-store";

export type TagCount = { tag: string; count: number };

export function collectTagCounts(records: { tags?: string[] }[]): TagCount[] {
  const counts = new Map<string, TagCount>();
  for (const record of records) {
    for (const tag of normalizeTags(record.tags ?? [])) {
      const key = tagKey(tag);
      const entry = counts.get(key);
      counts.set(key, { tag: entry?.tag ?? tag, count: (entry?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function ContentTags({ tags = [], hrefForTag, onNavigate }: { tags?: string[]; hrefForTag?: (tag: string) => string; onNavigate?: () => void }) {
  const { locale } = useHomeState();
  if (!tags.length) return null;
  return <div className="content-tags" aria-label={locale === "zh" ? "标签" : "Теги"}>
    {tags.map(tag => hrefForTag ? <Link className="content-tag" key={tagKey(tag)} href={hrefForTag(tag)} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate?.(); }}>#{tag}</Link> : <span className="content-tag" key={tagKey(tag)}>#{tag}</span>)}
  </div>;
}

export function TagFilter({ items, selected, onSelect }: { items: TagCount[]; selected: string; onSelect: (tag: string) => void }) {
  const { locale } = useHomeState();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const clearButton = useRef<HTMLButtonElement>(null);
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  if (!items.length && !selected) return null;
  const current = items.find(item => tagKey(item.tag) === tagKey(selected));
  const visible = expanded ? [...items] : items.slice(0, 6);
  if (selected && !visible.some(item => tagKey(item.tag) === tagKey(selected))) visible.push(current ?? { tag: selected, count: 0 });
  return <div className="tag-filter" role="group" aria-label={t("按标签筛选", "Фильтр по тегам")}>
    <div className="tag-filter-heading"><span><Tags size={16} aria-hidden="true" />{t("标签", "Теги")}</span>
      {items.length > 6 && <button type="button" className="tag-more" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>{expanded ? t("收起", "Свернуть") : t("展开全部", "Показать все")}<ChevronDown size={16} aria-hidden="true" /></button>}
    </div>
    <div className="tag-filter-options" id={listId}>
      <button ref={clearButton} type="button" className={`content-tag material-glass material-glass--chip${!selected ? " is-active" : ""}`} aria-pressed={!selected} onClick={() => onSelect("")}>{!selected && <Check size={16} aria-hidden="true" />}{t("全部标签", "Все теги")}</button>
      {visible.map(({ tag, count }) => {
        const active = tagKey(tag) === tagKey(selected);
        const Mark = active ? Check : Hash;
        return <button type="button" key={tagKey(tag)} className={`content-tag material-glass material-glass--chip${active ? " is-active" : ""}`} aria-pressed={active} onClick={() => { if (active) clearButton.current?.focus({ preventScroll: true }); onSelect(active ? "" : tag); }}><Mark className="tag-mark" size={16} aria-hidden="true" /><span className="tag-label">{tag}</span><span className="tag-count">{count}</span></button>;
      })}
    </div>
  </div>;
}

export type TagEditorHandle = { commit: () => string[] | null };

export function TagEditor({ value, onChange, suggestions = [], locale, ref }: { value: string[]; onChange: (tags: string[]) => void; suggestions?: string[]; locale: Locale; ref?: Ref<TagEditorHandle> }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const t = (zh: string, ru: string) => locale === "zh" ? zh : ru;
  const errorText = (code: string) => code === "tag_too_long" ? t(`每个标签最多 ${MAX_TAG_LENGTH} 个字。`, `В теге — не больше ${MAX_TAG_LENGTH} символов.`)
    : code === "too_many_tags" ? t(`最多添加 ${MAX_CONTENT_TAGS} 个标签。`, `Можно добавить до ${MAX_CONTENT_TAGS} тегов.`)
    : t("请换一个标签。", "Введите другой тег.");
  const errorMessage = error ? errorText(error) : "";
  useEffect(() => { input.current?.setCustomValidity(errorMessage); }, [errorMessage]);
  const pending = (text: string) => text.split(/[,，;；\n]+/).map(normalizeTag).filter(Boolean);
  function check(text: string) {
    try { normalizeTags([...value, ...pending(text)]); input.current?.setCustomValidity(""); setError(""); return true; }
    catch (cause) { const code = cause instanceof Error ? cause.message : "invalid_tags"; input.current?.setCustomValidity(errorText(code)); setError(code); return false; }
  }
  function add(text = draft) {
    if (!check(text)) return null;
    const tags = normalizeTags([...value, ...pending(text)]);
    onChange(tags);
    setDraft("");
    return tags;
  }
  useImperativeHandle(ref, () => ({ commit: () => composing.current ? null : add() }));
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.current || event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === "," || event.key === "，") { event.preventDefault(); add(); }
    else if (event.key === "Backspace" && !draft && value.length) { onChange(value.slice(0, -1)); }
    else if (event.key === "Escape" && draft) { event.preventDefault(); event.stopPropagation(); setDraft(""); check(""); }
  }
  const query = draft.normalize("NFKC").trim().replace(/^#+\s*/, "").toLowerCase();
  const choices = suggestions.filter((tag, index) => suggestions.findIndex(item => tagKey(item) === tagKey(tag)) === index)
    .filter(tag => !value.some(item => tagKey(item) === tagKey(tag)) && (!query || tagKey(tag).includes(query))).slice(0, 5);
  return <div ref={group} className="tag-editor" onBlur={event => {
    if (group.current?.contains(event.relatedTarget as Node | null) || !draft.trim()) return;
    const next = event.relatedTarget as HTMLButtonElement | HTMLInputElement | null;
    // Keep the submit target still between pointer down and click; the form commits pending tags.
    if (next?.type === "submit" && next.form && next.form === input.current?.form) { check(draft); return; }
    add();
  }}>
    <div className="tag-editor-label"><label htmlFor={`${id}-input`}>{t("标签", "Теги")}</label><span>{value.length} / {MAX_CONTENT_TAGS}</span></div>
    {!!value.length && <div className="content-tags tag-editor-selected">{value.map(tag => <button key={tagKey(tag)} type="button" className="content-tag" onClick={() => { onChange(value.filter(item => tagKey(item) !== tagKey(tag))); setError(""); input.current?.setCustomValidity(""); input.current?.focus(); }} aria-label={t(`移除标签 ${tag}`, `Удалить тег ${tag}`)}><span>#{tag}</span><X size={15} aria-hidden="true" /></button>)}</div>}
    <div className="tag-editor-input"><input ref={input} id={`${id}-input`} value={draft} placeholder={t("输入自定义标签，按回车添加", "Свой тег — добавьте клавишей Enter")} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      onChange={event => { setDraft(event.target.value); check(event.target.value); }} onKeyDown={keyDown} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} />
      <button type="button" className="button secondary" disabled={!draft.trim()} onClick={() => { add(); input.current?.focus(); }}><Plus size={17} aria-hidden="true" />{t("添加", "Добавить")}</button>
    </div>
    {error && <p id={`${id}-error`} className="tag-editor-error" role="alert">{errorText(error)}</p>}
    {!!choices.length && <div className="tag-editor-suggestions" role="group" aria-label={t("已有标签", "Уже используются")}><span>{t("已有标签", "Уже используются")}</span>{choices.map(tag => <button type="button" key={tagKey(tag)} className="content-tag" onClick={() => { add(tag); input.current?.focus(); }}>#{tag}</button>)}</div>}
  </div>;
}
