export function Brand({ light = false, href = "#top" }: { light?: boolean; href?: string }) {
  return <a className={`brand${light ? " brand-light" : ""}`} href={href} aria-label="StudentPath">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 25V13a5 5 0 0 1 5-5h12m-6-5 6 5-6 5M15 25h10" /><circle cx="8" cy="25" r="2.5" /></svg></span>
    <span className="brand-wordmark">StudentPath<span className="brand-dot">.</span></span>
  </a>;
}
