type Doodle = "traveler" | "cat" | "lookout" | "mushrooms" | "plane" | "fox" | "luggage";

const drawings = {
  traveler: <g>
    <g className="ink-swing">
      <path d="m24 52 9-1 9 5q3 2 2 6l-2 9-5-1 1-10-11-2q-4-1-3-6Z" />
      <path d="m34 52 9-2 8 5q3 1 3 5l1 8-5 1-2-10-11-2Z" />
      <path d="M37 68q-3 2-3 6 5 2 13-1-1-4-6-4Zm13-2q-2 4 0 7 7 0 11-4-2-3-7-2Z" />
    </g>
    <path d="M22 54q-1-19 6-23l13-1q8 4 9 23-13 4-28 1Z" />
    <path d="m24 42 23-1m-24 8 25-1m-23-11-6 13m26-16 8 12" fill="none" />
    <circle cx="19" cy="51" r="2.5" /><circle cx="54" cy="47" r="2.5" />
    <path d="M23 20q1-12 13-12 15 0 13 15-2 11-13 11-11-1-13-14Z" />
    <path d="M24 14q1-13 13-12 9 1 10 10l9 4q-13 5-38 1Z" />
    <path d="m26 11 17-1" stroke="var(--spatial-gold)" />
    <path d="m30 22 1 1m10-2 1 1m-10 4q4 4 8-1" fill="none" />
    <path d="m9 8 2 4 4 1-4 2-1 4-2-4-4-1 4-2Z" fill="var(--spatial-teal)" strokeWidth="1.2" />
  </g>,
  cat: <g>
    <path className="ink-tail" d="M32 65q23 0 21-16-2-10 3-11 8 0 5 17-3 18-28 17Z" />
    <path d="M13 69q-4-22 8-30l14-1q10 12 8 32-16 5-30-1Z" />
    <path d="m20 54-1 15-6 2m18-17 1 15 6 2" fill="none" />
    <path d="m9 26-2-19 13 9q7-3 15-2l12-11-1 21q6 15-8 20-20 7-29-5-3-5 0-13Z" />
    <path d="m12 14 3 5m25-4 3-5M6 30l9 2M5 38l10-2m26-6 10-4m-10 9 12 2" fill="none" strokeWidth="1.6" />
    <path d="m20 29 2-2 2 2" fill="none" /><ellipse cx="35" cy="26" rx="2" ry="3" fill="currentColor" />
    <path d="m26 32 4-1-2 3Zm1 3q-1 5-5 2m5-2q3 4 6 0" fill="none" strokeWidth="1.5" />
    <path d="M17 43q12 6 23-3l-1 6-7 2 6 8-9-3-2-5-9-1Z" fill="var(--spatial-pink)" />
  </g>,
  lookout: <g>
    <g className="ink-peek">
      <path d="M9 45q-1-8 0-16Q10 8 27 7q22-1 24 19l1 17q-17-4-43 2Z" />
      <ellipse cx="24" cy="28" rx="6" ry="8" /><ellipse cx="37" cy="27" rx="6" ry="8" />
      <path d="m26 29 1 2m11-4 1 2m-10 8q3 3 6-1" />
    </g>
    <path d="M6 45q0-9 6-9 7 0 7 8-7 3-13 1Zm37-1q-1-9 5-10 7-1 8 8-7 4-13 2Z" />
    <path d="m49 12 4-6m1 10 5-2" stroke="var(--spatial-gold)" />
  </g>,
  mushrooms: <g>
    <path d="M21 60q5-11 3-22l9-1q-1 16 4 22-8 4-16 1Z" />
    <path d="M7 38q4-20 22-22 16-1 22 19-18 8-44 3Z" fill="var(--spatial-pink)" />
    <path d="M20 28h1m11-5h1m7 9h1" stroke="var(--spatial-paper)" strokeWidth="4" />
    <path d="m44 58 2-10 5-1 2 11Z" /><path d="M37 47q2-11 12-12 8 0 12 11-13 4-24 1Z" fill="var(--spatial-teal)" />
    <path d="m12 57-4-5m7 6-1-9m39-23 1-7m3 8 4-3" fill="none" />
  </g>,
  plane: <g>
    <path d="M2 49q21 6 21-4 1-7-6-5-8 4 11 7l7-3" fill="none" strokeDasharray="2 4" strokeWidth="1.8" />
    <g className="ink-glide">
      <path d="m26 26 35-13-11 26-11-6-6 5-1-9Z" fill="var(--spatial-teal)" />
      <path d="m32 29 27-15-20 19m-4 2 2-5" fill="none" />
    </g>
    <path d="m10 13 2 4 4 1-4 2-1 4-2-4-4-1 4-2Z" fill="var(--spatial-gold)" strokeWidth="1.3" />
  </g>,
  fox: <g>
    <path d="M26 63C12 67 3 57 4 44q4 5 10 7 12 2 17 11Z" />
    <path d="m6 49 6 6 1-3 3 4" fill="none" />
    <g className="ink-wave">
      <path d="M46 48q7-6 11-15-2-5 0-7 2-1 4 3 1-7 4-6 2 1 0 8 5-5 6-2 0 3-6 8-5 13-14 17Z" />
      <path d="m60 16 1-4m6 6 4-4" fill="none" stroke="var(--spatial-gold)" />
    </g>
    <path d="M21 63q1-15 11-22l13-1q7 7 7 23l-9 3-3-6-3 7-13-1Z" />
    <path d="M23 64q5-6 11-1m9-1q6-4 10 0" fill="none" />
    <path d="M18 28 19 6l13 13q5-2 11 0l12-14-1 23 3 4-9 9-10 6-14-7-9-9Z" />
    <path d="m23 15 1 8 5-3m16 0 6-6-1 9" fill="var(--spatial-pink)" strokeWidth="1.4" />
    <path d="M20 30q8 0 15 8m18-9q-6 0-13 9m-12-9q3-4 6 0m6-1q3-4 6 0" fill="none" strokeWidth="1.7" />
    <path d="m35 35 5-1-2 4Z" fill="currentColor" /><path d="m36 41 3 1 3-3" fill="none" strokeWidth="1.4" />
    <path d="m25 41 11 5 12-5 1 4-12 6-5-1-5 10-5-3 6-9-5-4Z" fill="var(--spatial-teal)" />
  </g>,
  luggage: <g transform="rotate(8 29 36)">
    <path d="m21 19 1-8q1-4 9-3 7 0 7 4v7m-13-2v-5l9 1v5" />
    <path d="M8 20q19-3 39-1 5 0 5 5l-1 24q-1 5-5 5l-38-1q-4 0-4-5l1-22q0-4 3-5Z" />
    <path d="m14 20-1 31m28-31-1 32" stroke="var(--spatial-gold)" />
    <path d="m22 31 8-3 3 8-8 3Z" fill="var(--spatial-pink)" strokeWidth="1.4" />
    <path d="m33 18 4-5 6 1 4 6-5 5Z" fill="var(--spatial-teal)" strokeWidth="1.5" />
    <path d="M10 53v3m33-2v3M3 58q15 2 29 1" fill="none" strokeWidth="1.6" />
  </g>,
};

const frames: Record<Doodle, string> = {
  traveler: "0 0 64 78", cat: "2 0 64 76", lookout: "3 1 59 47",
  mushrooms: "4 11 60 53", plane: "0 7 65 50",
  fox: "0 2 75 67", luggage: "0 4 58 59",
};

export function InkTitleDoodle({ kind }: { kind: Doodle }) {
  return <svg className={`ink-doodle ink-doodle--${kind}`} viewBox={frames[kind]}
    fill="var(--spatial-night)" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">{drawings[kind]}</svg>;
}
