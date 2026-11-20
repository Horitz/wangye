export type DragonLandmark = "coin" | "castle";

function CoinCache() {
  return <svg viewBox="0 0 80 60" shapeRendering="crispEdges" aria-hidden="true">
    <ellipse cx="40" cy="53" rx="32" ry="3" fill="#785076" opacity=".16"/>
    <path fill="#875747" d="M9 38h5v-3h21v3h5v14h-5v3H14v-3H9zm30-3h6v-3h19v3h6v13h-6v3H45v-3h-6z"/>
    <path fill="#e79a3d" d="M11 40h26v4H11zm2 7h24v4H13zm29-11h25v5H42zm0 8h25v3H42z"/>
    <path fill="#ffe693" d="M15 37h17v3H15zm-2 8h18v2H13zm33-11h16v3H46z"/>
    <g className="landmark-coin-face">
      <path fill="#84503d" d="M28 6h16v3h6v5h4v18h-3v6h-6v4H28v-3h-6v-6h-4V16h3v-6h7z"/>
      <path fill="#ffd45d" d="M29 9h14v3h6v5h2v13h-3v6h-5v3H29v-3h-6v-6h-2V18h3v-6h5z"/>
      <path fill="#da8536" d="M29 14h13v3h4v13h-4v4H30v-3h-4V19h3z"/>
      <path fill="#fff3a9" d="M35 15h3v5h3v2h4v3h-5v4h-3v4h-3v-5h-3v-3h-4v-3h5v-3h3z"/>
      <path fill="#fff9d3" d="M27 12h9v2h-8v4h-3v-4h2z"/>
    </g>
    <path fill="#f5c64e" d="M64 8h2v5h5v2h-5v5h-2v-5h-5v-2h5zM9 24h2v3h3v2h-3v3H9v-3H6v-2h3z"/>
  </svg>;
}

function Lookout() {
  return <svg viewBox="0 0 128 104" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="#c3b8ce" opacity=".36" d="M9 88h90v-3h15v6h-10v3H22v-3H9z"/>
    <path fill="#70a88f" d="M8 81h12v-5h82v5h13v6h-9v4H24v-3H8z"/>
    <path fill="#514967" d="M17 40h24v38H17zm25 9h15V27h22v21h12V34h24v45h-8v5H23v-5h-6V55h25z"/>
    <path fill="#b5a9d1" d="M20 43h18v34H20zm24 8h14V30h18v20h17V38h18v39h-7v4H27v-3h16z"/>
    <path fill="#e2d9ec" d="M20 44h5v30h-5zm39-14h5v24h-5zm35 9h5v34h-5zM29 53h7v3h-7zm37-13h6v2h-6zm30 23h8v3h-8zM44 65h7v3h-7zm35 8h6v3h-6z"/>
    <path fill="#89799e" d="M34 43h4v34h-4zm38-11h4v19h-4zm35 7h4v36h-4zM23 63h7v2h-7zm48-5h8v3h-8zm-25 14h9v2h-9z"/>
    <path fill="#4d425d" d="M14 40h3v-6h4v-7h5v-9h5v8h4v7h4v6h4v4H14zm40-13v-5h4v-6h5V7h6v8h5v5h4v7h4v4H54zm33 7h4v-6h5v-6h4v-7h5v7h5v8h4v4h4v4H87z"/>
    <path fill="#8875b2" d="M20 37h4v-8h4v-6h2v9h4v6h4v2H20zm39-13h5v-9h4v6h5v5h4v2H59zm33 8h6v-7h4v-6h2v8h4v6h4v2H92z"/>
    <path fill="#d2c1e7" d="M20 37h5v-7h3v-5h2v7h-3v6h-7zm41-13h5V14h2v9h-3v3h-4zm34 8h5v-6h2v-4h2v6h-3v5h-6z"/>
    <path fill="#61516e" d="M41 50v-8h6v5h5v-5h6v5h6v-5h6v5h6v-5h6v5h6v-5h6v10H41zm16 31V68h3v-5h4v-3h7v3h4v5h3v13zM26 54v-6h4v6zm39-17v-5h4v5zm36 16v-7h4v7z"/>
    <path fill="#f4cc78" d="M27 50h2v3h-2zm75-2h2v4h-2zM65 64h5v3h3v13H62V68h3z"/>
    <path fill="#75604e" d="M65 69h1v10h-1zm4-2h1v12h-1z"/>
    <path fill="#695673" d="M66 9V0h2v9z"/>
    <path fill="#de8e9c" d="M68 0h13v2h5l-5 3H68z"/>
    <path fill="#a9cdb0" d="M10 80h3v-6h3v5h3v5h-9zm92 3h4v-6h3v5h6v4h-13z"/>
    <path fill="#df9baa" d="M16 74h4v3h-4zm94 2h4v3h-4z"/>
  </svg>;
}

export function DragonLandmarks() {
  return <div className="dragon-landmarks" aria-hidden="true">
    <span className="dragon-landmark" data-dragon-target="castle"><Lookout /></span>
    <span className="dragon-landmark" data-dragon-target="coin"><CoinCache /></span>
  </div>;
}
