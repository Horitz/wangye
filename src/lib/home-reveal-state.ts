export type HomeRevealState = "above" | "visible" | "below";

const REVEAL_EDGE = 48;

/** Use the stable section bounds, so tall mobile chapters stay visible while being read. */
export function getHomeRevealState(
  bounds: { top: number; bottom: number },
  viewportHeight: number,
  reducedMotion: boolean,
): HomeRevealState {
  if (reducedMotion) return "visible";
  if (bounds.bottom <= REVEAL_EDGE) return "above";
  if (bounds.top >= viewportHeight - REVEAL_EDGE) return "below";
  return "visible";
}
