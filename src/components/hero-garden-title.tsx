import type { Locale } from "@/lib/home-store";
import "@/app/hero-garden-title.css";

type Growth = "meadow" | "vine" | "crystal";
type Material = "earth" | "ore";

function LetterGrowth({ kind }: { kind: Growth }) {
  if (kind === "meadow") return <svg className="garden-growth garden-growth--meadow" viewBox="0 0 64 28" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
    <path className="garden-growth-dark" d="M2 28V18h4v4h4V12h4v12h4v4zm22 0V16h4v8h4V20h4v8zm22 0V14h4v10h4V18h4v10z" />
    <path className="garden-growth-green" d="M6 28V22h4v6zm8 0V18h4v10zm18 0V14h4v10h4v4zm18 0V22h4v6z" />
    <path className="garden-growth-stem" d="M22 26V8h4v12h4v4h-4v2zM42 28V12h4v8h4v4h-4v4z" />
    <path className="garden-growth-flower" d="M20 0h8v4h4v8h-4v4h-8v-4h-4V4h4z" />
    <path className="garden-growth-gold" d="M22 6h4v4h-4zM40 6h8v4h4v4h-4v4h-8v-4h-4v-4h4z" />
    <path className="garden-growth-paper" d="M42 10h4v4h-4z" />
  </svg>;
  if (kind === "vine") return <svg className="garden-growth garden-growth--vine" viewBox="0 0 20 52" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
    <path className="garden-growth-stem" d="M2 0h8v8h4v20h-4v12H6v12H2V36h4V24h4V10H6V4H2z" />
    <path className="garden-growth-green" d="M10 8h8v8h-8zM2 18h8v8H2zm8 12h8v8h-8zM0 40h8v8H0z" />
    <path className="garden-growth-light" d="M10 8h4v4h-4zM2 18h4v4H2zm8 12h4v4h-4zM0 40h4v4H0z" />
  </svg>;
  return <svg className="garden-growth garden-growth--crystal" viewBox="0 0 28 28" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
    <path className="garden-crystal-shadow" d="M2 26V16h4v-4h4v8h4V8h4V0h4v8h4v18z" />
    <path className="garden-crystal-front" d="M4 26V16h4v6h4v4zm12 0V8h4V2h2v24z" />
    <path className="garden-crystal-light" d="M16 10h4v8h-4zM4 16h4v4H4z" />
  </svg>;
}

/** Each visible run remains selectable text; only its shallow back face is hidden. */
function GardenRun({ text, material, growth }: { text: string; material: Material; growth?: Growth }) {
  return <span className={`garden-run garden-run--${material}${growth ? ` garden-run--growing-${growth}` : ""}`}>
    <span className="garden-run-depth" aria-hidden="true">{text}</span>
    <span className="garden-run-face">{text}</span>
    {growth && <LetterGrowth kind={growth} />}
  </span>;
}

export function HeroGardenTitle({ locale }: { locale: Locale }) {
  return <span className={`hero-pixel-accent hero-garden-title hero-garden-title--${locale}`}>
    {locale === "zh" ? <>
      <span className="garden-line"><GardenRun text="开" material="earth" growth="meadow" /><GardenRun text="启你" material="earth" /><GardenRun text="的" material="earth" growth="vine" /></span>
      <br />
      <span className="garden-line"><GardenRun text="留学" material="ore" /><GardenRun text="新" material="ore" growth="crystal" /><GardenRun text="生活。" material="ore" /></span>
    </> : <>
      <GardenRun text="в" material="ore" />{" "}<GardenRun text="Москве." material="earth" growth="meadow" />
    </>}
  </span>;
}
