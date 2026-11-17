import type { ReactNode } from "react";

/** One reading-card structure for community posts and site-authored guides. */
export function ContentPostCard({ children, footer, className = "" }: { children: ReactNode; footer: ReactNode; className?: string }) {
  return <article className={`content-post-card ${className}`}>{children}<div className="content-post-footer">{footer}</div></article>;
}

export function ContentPostCopy({ category, title, children }: { category: string; title: ReactNode; children?: ReactNode }) {
  return <div className="content-post-copy"><span className="content-post-category">{category}</span><h2>{title}</h2>{children}</div>;
}

export function PostByline({ name, detail, avatar }: { name: string; detail?: string; avatar?: ReactNode }) {
  if (!name && !detail) return null;
  return <div className="post-byline"><span className="post-byline-avatar" aria-hidden="true">{avatar ?? (name.trim().slice(0, 1) || "S")}</span><div><span>{name}</span>{detail && <small>{detail}</small>}</div></div>;
}
