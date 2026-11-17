export type NightSkyPlanetKind = "ringed" | "moon" | "striped";

/** Quiet, original celestial ornaments; the surrounding sky supplies their palette. */
export function NightSkyPlanet({ kind }: { kind: NightSkyPlanetKind }) {
  return <svg viewBox="0 0 160 128" aria-hidden="true" focusable="false">
    {kind === "ringed" ? <g transform="rotate(-22 80 64)">
      <ellipse cx="80" cy="64" rx="69" ry="19" fill="none" stroke="var(--sky-planet-ring)" strokeWidth="9" opacity=".55" />
      <circle cx="80" cy="64" r="36" fill="var(--sky-planet-body)" />
      <path d="M52 50c5-14 22-23 36-17-16 0-27 10-30 24-2 6-8 3-6-7Z" fill="var(--sky-planet-light)" opacity=".7" />
      <path d="M95 31a36 36 0 0 1-34 64c22 3 42-15 42-36 0-11-3-20-8-28Z" fill="var(--sky-planet-shadow)" opacity=".65" />
      <path d="M11 64a69 19 0 0 0 138 0" fill="none" stroke="var(--sky-planet-ring)" strokeWidth="9" strokeLinecap="round" />
      <path d="M17 70c19 14 102 14 126 0" fill="none" stroke="var(--sky-planet-light)" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </g> : kind === "moon" ? <>
      <circle cx="80" cy="64" r="39" fill="var(--sky-planet-body)" />
      <path d="M94 28a39 39 0 0 1-34 69c24 3 44-17 44-40 0-12-4-22-10-29Z" fill="var(--sky-planet-shadow)" opacity=".55" />
      <path d="M51 49c5-12 15-19 27-19" fill="none" stroke="var(--sky-planet-light)" strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <circle cx="64" cy="51" r="8" fill="var(--sky-planet-shadow)" opacity=".45" />
      <path d="M59 55c2 3 7 4 10 1" fill="none" stroke="var(--sky-planet-light)" strokeWidth="2" strokeLinecap="round" opacity=".75" />
      <circle cx="90" cy="76" r="10" fill="var(--sky-planet-shadow)" opacity=".4" />
      <path d="M83 81c4 4 10 4 14-1" fill="none" stroke="var(--sky-planet-light)" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      <circle cx="62" cy="83" r="4" fill="var(--sky-planet-shadow)" opacity=".5" />
    </> : <g transform="rotate(16 80 64)">
      <circle cx="80" cy="64" r="39" fill="var(--sky-planet-body)" />
      <path d="M51 38c20 12 39-10 57-1 4 4 7 8 9 13-26-11-44 12-74 1 2-5 4-9 8-13Z" fill="var(--sky-planet-light)" opacity=".6" />
      <path d="M41 64c24 12 51-10 78-2 0 5-1 9-2 13-28-11-48 13-74 1-1-4-2-8-2-12Z" fill="var(--sky-planet-ring)" opacity=".55" />
      <path d="M52 91c20 8 35-9 57-1-7 8-17 13-29 13-11 0-21-5-28-12Z" fill="var(--sky-planet-light)" opacity=".5" />
      <path d="M95 28a39 39 0 0 1-35 69c24 3 44-17 44-40 0-12-4-22-9-29Z" fill="var(--sky-planet-shadow)" opacity=".5" />
      <path d="m57 58 10 1m24-7 9-1" fill="none" stroke="var(--sky-planet-light)" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </g>}
  </svg>;
}
