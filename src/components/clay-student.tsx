export type ClayStudentVariant = "curly" | "glasses" | "longhair" | "beanie";

/** Decorative portrait; the surrounding scene owns its size, crop and motion. */
export function ClayStudent({ variant = "curly" }: { variant?: ClayStudentVariant }) {
  return (
    <div className={`clay-student clay-student--${variant}`} aria-hidden="true">
      <div className="clay-figure">
        {variant === "longhair" && <span className="clay-hair-back" />}
        {variant === "curly" && <span className="clay-backpack" />}
        <span className="clay-body" />
        <span className="clay-neck" />
        <span className="clay-ear clay-ear--left" />
        <span className="clay-ear clay-ear--right" />
        <div className="clay-face">
          <span className="clay-brow clay-brow--left" />
          <span className="clay-brow clay-brow--right" />
          <span className="clay-eye clay-eye--left" />
          <span className="clay-eye clay-eye--right" />
          <span className="clay-nose" />
          <span className="clay-smile" />
          <span className="clay-cheek clay-cheek--left" />
          <span className="clay-cheek clay-cheek--right" />
          {variant === "glasses" && (
            <div className="clay-glasses">
              <span className="clay-lens clay-lens--left" />
              <span className="clay-lens clay-lens--right" />
              <span className="clay-glasses-bridge" />
            </div>
          )}
        </div>
        <div className="clay-hair"><i /><i /><i /><i /><i /></div>
        {variant === "curly" && <><span className="clay-strap clay-strap--left" /><span className="clay-strap clay-strap--right" /></>}
        {variant === "glasses" && <><span className="clay-jacket-seam" /><span className="clay-jacket-pocket" /></>}
        {variant === "longhair" && <><span className="clay-hair-lock clay-hair-lock--left" /><span className="clay-hair-lock clay-hair-lock--right" /></>}
        {variant === "beanie" && (
          <>
            <span className="clay-hood" />
            <div className="clay-beanie"><span className="clay-beanie-rim" /><span className="clay-beanie-pom" /></div>
          </>
        )}
        <span className="clay-collar" />
        {variant === "curly" && <span className="clay-emblem">S</span>}
      </div>
    </div>
  );
}
