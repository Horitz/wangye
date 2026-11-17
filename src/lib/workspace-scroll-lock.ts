type OverflowStyle = Pick<CSSStyleDeclaration, "overflow">;

const locks = new WeakMap<OverflowStyle, { owners: number; previousOverflow: string }>();

/** Keep the page locked until the last workspace dialog closes, in any order. */
export function lockWorkspaceScroll(style: OverflowStyle): () => void {
  const lock = locks.get(style) ?? { owners: 0, previousOverflow: style.overflow };
  lock.owners += 1;
  locks.set(style, lock);
  style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.owners -= 1;
    if (lock.owners !== 0) return;
    style.overflow = lock.previousOverflow;
    locks.delete(style);
  };
}
