export type SwipeAxis = "horizontal" | "vertical" | null;

/** Wait for a deliberate direction so a picture does not steal vertical reading. */
export function getSwipeAxis(dx: number, dy: number): SwipeAxis {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return null;
  if (Math.abs(dy) >= Math.abs(dx) * 1.1) return "vertical";
  if (Math.abs(dx) >= Math.abs(dy) * 1.1) return "horizontal";
  return null;
}

export function resolveSwipeIndex(index: number, count: number, dx: number, width: number) {
  const current = Math.max(0, Math.min(index, Math.max(0, count - 1)));
  if (count < 2 || width <= 0 || !Number.isFinite(dx) || !Number.isFinite(width)) return current;
  const threshold = Math.min(72, Math.max(32, width * .14));
  if (Math.abs(dx) < threshold) return current;
  return Math.max(0, Math.min(count - 1, current + (dx < 0 ? 1 : -1)));
}

export function getSwipeOffset(index: number, count: number, dx: number, width: number) {
  if (count < 2 || width <= 0) return 0;
  const atEdge = (index === 0 && dx > 0) || (index >= count - 1 && dx < 0);
  return atEdge ? Math.sign(dx) * Math.min(48, Math.abs(dx) * .25) : Math.max(-width, Math.min(width, dx));
}
