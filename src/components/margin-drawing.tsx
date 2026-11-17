export type MarginDrawingKind = "reader" | "traveler" | "cat" | "plant" | "camera" | "headphones";

function Reader() {
  return <>
    <path className="margin-soft" d="M34 112c-12-42 28-77 77-70 47 6 80 42 85 92 5 48-26 89-74 89-57 0-76-52-88-111Z" />
    <path className="margin-line" d="M29 228q56-5 105-1m15 0 53-3" />
    <path className="margin-teal" d="m60 183 113-3 4 13-117 4Z" />
    <path className="margin-line" d="m69 198-5 29m100-32 8 31" />
    <path className="margin-lilac" d="M92 153c-18 10-29 26-16 36 13 9 38-3 48-8l19 34 15-4-12-45-28-16Z" />
    <path className="margin-line" d="m121 169-28 11m54 22 9-2" />
    <path className="margin-paper" d="m143 212-1 15q13 6 29-1l-2-8-13-7m-77-28-9 17q1 6 18 7l9-7-6-12" />
    <path className="margin-gold" d="M82 98q19-14 42-2 18 18 21 66-29 17-63-2l-8-34Z" />
    <path className="margin-line" d="m94 103 8 13 13-14m-15 14-2 18m15-18 2 16m-29 18 10 4" />
    <path className="margin-paper" d="m94 88 1 16q9 10 18-2l-3-15" />
    <path className="margin-paper" d="M81 59q5-23 32-20c24 3 29 31 19 46-9 14-35 15-45-1-5-7-7-16-6-25Z" />
    <path className="margin-ink" d="M82 66c-10-9-9-23 1-27-1-16 24-24 29-10 19-3 29 10 22 23-12 1-23-2-30-9-1 15-11 17-22 23Z" />
    <path className="margin-line" d="M90 67q4-5 9 0m16-1q4-5 9 0m-19 0-1 9 5 1m-10 7q8 5 14-1" />
    <path className="margin-paper" d="M75 112c-13 7-14 26-2 35l25 8 5-10-22-12 7-12m44-10c14 9 24 24 11 35l-17 7-5-10 14-9-11-14" />
    <path className="margin-teal" d="m96 123 22 3 26-10-3 39-24 11-23-7Z" />
    <path className="margin-paper" d="m100 118 18 7 23-13 2 36-26 14-19-7Z" />
    <path className="margin-line" d="m118 127-1 31m9-27 10-5m-11 13 10-5m-32 0 8 3" />
    <path className="margin-paper" d="M94 143q8-2 9 4l-2 8-9-2m46-14q-8 0-8 7l3 6 8-5" />
    <path className="margin-line" d="m45 81-7-5m9-4-2-7m126 73 8-4m-4 13 9 1" />
    <path className="margin-pink" d="m171 68 4-9 4 9 9 4-9 3-4 10-4-10-9-3Z" />
  </>;
}

function Traveler() {
  return <>
    <path className="margin-soft" d="M54 84c5-40 63-57 101-26s54 93 23 129c-28 34-99 47-128 5-24-34-7-73 4-108Z" />
    <path className="margin-line" d="M31 231q58-4 105-1m13-1 52-3" />
    <path className="margin-teal" d="M75 96c-18-5-31 9-32 27l3 35q8 11 29 1l12-42Z" />
    <path className="margin-line" d="m48 131 17-2 2 22-17 2m-3-32 10-2m-2 16 1 6" />
    <path className="margin-lilac" d="m75 157 6 57 15 1 10-42 18 43 17-4-15-60Z" />
    <path className="margin-line" d="m107 165-1 8m-23 30 15 1m24-1 16-3" />
    <path className="margin-paper" d="m81 213-6 14q15 6 28 1l-1-10-7-4m29 1 4 14 27-3-1-9-15-5" />
    <path className="margin-gold" d="M76 95q22-11 44 1 15 22 11 63-31 12-60-2l-7-36Z" />
    <path className="margin-line" d="m87 98 13 16 11-16m-10 17-2 23m12 0 10-2m-42 12q18 8 40 0" />
    <path className="margin-paper" d="m88 84 1 16q10 9 19-2l-1-14" />
    <path className="margin-paper" d="M78 53c8-20 32-19 43-4 13 19 6 42-12 45-22 3-37-20-31-41Z" />
    <path className="margin-ink" d="M77 65q-13-14-5-29 8-13 24-10 7-11 20-1 17-1 18 13 9 15-9 22l-5-15q-17 11-29 4-1 12-14 16Z" />
    <path className="margin-line" d="m92 66 1 3m20-5 1 3m-12 1-2 9 5 1m-9 7q7 4 13-2" />
    <path className="margin-paper" d="M69 111q-12 15-10 42l9 20q6 6 11 0l-5-25 9-26" />
    <path className="margin-line" d="m63 159 11-2m2 10-2-6" />
    <g className="margin-motion margin-wave">
      <path className="margin-paper" d="M124 98q12 9 18 5l21-32-4-12q-2-9 3-10 5-1 7 8l4-17q1-5 5-4 4 1 2 7l-2 16 5-15q2-5 6-3 3 1 1 7l-4 17 4-7q4-5 7-2 3 3-2 11l-9 12q-16 50-39 48l-29-12Z" />
      <path className="margin-line" d="m163 73 16 7m-11-17 7 7" />
    </g>
    <path className="margin-line" d="M78 97q10 8 10 34m-6 2 11-2m-5-34q12 5 24-1" />
    <path className="margin-pink" d="m186 141 4 9 10 2-8 6 1 11-9-6-9 4 3-10-6-7 11-1Z" />
    <path className="margin-line" d="m45 62-8-5m15-4-2-9m150 52 8-3m-6 12 9 1" />
  </>;
}

function Cat() {
  return <>
    <path className="margin-soft" d="M29 143c-2-47 28-91 82-91 54 0 104 54 100 99-5 49-43 76-96 72-51-4-85-32-86-80Z" />
    <path className="margin-line" d="M25 222q56-3 113-1m12 0 61-3" />
    <path className="margin-lilac" d="m47 192 141-5 2 25-142 4q-9-11-1-24Z" />
    <path className="margin-paper" d="m57 196 128-4 1 16-129 4q-5-7 0-16Z" />
    <path className="margin-line" d="m67 201 101-3m-99 8 61-2" />
    <path className="margin-teal" d="m64 176 120 2-3 15-121-2q-5-7 4-15Z" />
    <path className="margin-paper" d="m69 180 112 2-1 7-112-2" />
    <g className="margin-motion margin-tail">
      <path className="margin-gold" d="M164 163c31-1 41-16 30-32-6-10 0-16 7-11 28 21 12 54-31 54Z" />
      <path className="margin-line" d="m196 134 9-6m-7 18 13 2" />
    </g>
    <path className="margin-gold" d="M93 117c19-18 49-20 69-4 18 13 24 36 13 52-11 17-48 21-82 13-26-7-28-41 0-61Z" />
    <path className="margin-line" d="M143 137c19 3 23 24 9 30-9 4-17 4-25 2m14-55-2 13m14-8-2 12" />
    <path className="margin-gold" d="m69 123-2-27 23 13q14-6 27 2l21-11-2 31c6 18-6 37-30 39-27 2-46-18-37-47Z" />
    <path className="margin-pink" d="m74 105 2 15 10-7m43-4-12 7 11 7" />
    <path className="margin-line" d="M78 139q6 7 13 0m19-1q6 7 13-1m-29 16q5 6 10-1 5 5 10-1m-15-2 1 4m-29-9-15-4m14 11-15 1m72-11 13-5m-12 12 15-1m-48-32 1 8m7-9-1 8" />
    <path className="margin-ink" d="m96 147 8-1-4 5Z" />
    <path className="margin-paper" d="M91 163q-13-4-17 2t10 9l21-2q5-6-2-9m36 5q-11-5-15 1t9 6l16-1" />
    <path className="margin-line" d="m82 167-1 6m7-5-1 5m44-2-1 4" />
    <path className="margin-lilac" d="m165 71 4 9 10 1-8 7 2 11-9-6-9 5 2-11-7-7 10-1Z" />
    <path className="margin-line" d="m57 78-5-6m14 1 1-9m132 119 7-3" />
  </>;
}

function Plant() {
  return <>
    <path className="margin-soft" d="M35 157c-3-51 35-91 78-87 54 6 87 45 87 87-1 44-33 65-79 66-51 2-83-21-86-66Z" />
    <path className="margin-line" d="M38 225q47-4 102-2m13 0 44-3" />
    <path className="margin-line" d="M119 164q6-52-4-99m6 70q-28-9-43-40m43 12q24-3 42-30" />
    <g className="margin-motion margin-leaf">
      <path className="margin-teal" d="M115 83c-28-9-35-33-18-54 26 8 33 32 18 54Z" />
      <path className="margin-line" d="m99 43 16 40" />
      <path className="margin-teal" d="M122 108c-1-33 24-48 50-40-2 28-22 43-50 40Z" />
      <path className="margin-line" d="m123 108 35-29" />
    </g>
    <path className="margin-teal" d="M99 126c-33 3-53-16-50-43 30-4 53 14 50 43Z" />
    <path className="margin-line" d="m61 95 38 31" />
    <path className="margin-gold" d="M121 143c1-25 20-37 42-31-3 24-19 35-42 31Z" />
    <path className="margin-line" d="m121 143 28-23" />
    <path className="margin-lilac" d="m80 166 85-1-11 48q-34 14-64-1Z" />
    <path className="margin-paper" d="m77 155 92 1-2 16-88 1Z" />
    <path className="margin-line" d="m91 180 5 23m53-24-4 24m-35-14q10 8 20-1" />
    <circle className="margin-ink" cx="108" cy="182" r="2" />
    <circle className="margin-ink" cx="133" cy="182" r="2" />
    <path className="margin-pink" d="m184 135 3 8 9 2-8 4-3 9-3-9-9-3 8-3Z" />
    <path className="margin-line" d="m61 56-7-4m15-4 1-8m111 141 8-1m-141 47-5 5m10-2-2 7" />
    <path className="margin-gold" d="m43 158 7-4 6 5-2 8-8 1-4-5Z" />
  </>;
}

function Camera() {
  return <>
    <path className="margin-soft" d="M37 104c23-35 71-62 113-42 52 24 66 82 39 124-26 41-83 48-121 16-32-26-51-68-31-98Z" />
    <path className="margin-line" d="M28 225q61-4 122-2m12 0 46-3" />
    <path className="margin-paper" d="m132 111 74 14-20 91-74-15Z" />
    <path className="margin-teal" d="m139 121 56 11-11 55-56-11Z" />
    <path className="margin-line" d="m129 172 20-24 9 14 15-10 14 23m-50 26 18 4" />
    <circle className="margin-gold" cx="179" cy="143" r="6" />
    <path className="margin-line" d="M60 96c-23-28-13-63 18-63 30 0 43 23 31 48" />
    <path className="margin-paper" d="m51 91 8-20 43-4 13 15 35-1q12 0 14 13l7 65q2 13-12 15l-100 8q-13 0-14-14l-7-60q-1-13 13-17Z" />
    <path className="margin-pink" d="m43 119 122-10 6 50q2 13-12 15l-100 8q-13 0-14-14Z" />
    <path className="margin-line" d="m46 125 20-2m-13 6 15-1m-17 6 15-1" />
    <path className="margin-lilac" d="m69 76 24-2 2 14-25 2Z" />
    <path className="margin-teal" d="m123 92 24-2 2 13-25 2Z" />
    <circle className="margin-paper" cx="107" cy="133" r="32" />
    <circle className="margin-lilac" cx="107" cy="133" r="23" />
    <circle className="margin-ink" cx="107" cy="133" r="13" />
    <path className="margin-paper" d="M100 121q9-4 14 3l-7 6Z" />
    <path className="margin-line" d="m87 169 38-3m-8-75 2 10m-47 68 4-1" />
    <circle className="margin-gold" cx="57" cy="108" r="6" />
    <path className="margin-gold" d="m180 50 4 12 13 3-13 4-4 13-4-13-12-4 12-3Z" />
    <path className="margin-line" d="m153 42 3-9m43 58 8-3m-171 95-9-1" />
  </>;
}

function Headphones() {
  return <>
    <path className="margin-soft" d="M38 101c19-42 73-59 113-32 43 30 67 85 39 123-28 40-82 38-121 11-40-27-52-58-31-102Z" />
    <path className="margin-line" d="M29 226q55-5 119-2m14 0 43-3" />
    <path className="margin-paper" d="m54 143 107-12 10 78-108 12Z" />
    <path className="margin-pink" d="m62 151 91-10 7 57-91 10Z" />
    <circle className="margin-lilac" cx="119" cy="150" r="52" />
    <circle className="margin-line" cx="119" cy="150" r="41" />
    <circle className="margin-line" cx="119" cy="150" r="34" />
    <circle className="margin-gold" cx="119" cy="150" r="17" />
    <circle className="margin-paper" cx="119" cy="150" r="4" />
    <path className="margin-line" d="M83 133q7-17 22-22m26 77q17-5 24-21" />
    <path className="margin-teal" d="M54 122C45 75 69 37 111 37c43 0 69 32 65 78l-14 2c3-39-16-65-50-65-33 0-52 30-44 68Z" />
    <path className="margin-line" d="M62 89c4-26 22-43 48-43 27 0 45 15 52 40" />
    <path className="margin-paper" d="m53 111 16-2q7 0 9 9l3 34q0 10-7 10l-16 1q-8 0-9-9l-3-32q-1-10 7-11Z" />
    <path className="margin-lilac" d="m67 113 9-1q6 1 7 8l3 30q1 9-5 10l-9 1Z" />
    <path className="margin-paper" d="m164 108 15 2q8 1 8 10l-3 30q-1 9-8 9l-15-1q-8 0-7-11l3-29q0-10 7-10Z" />
    <path className="margin-lilac" d="m158 112 9 1-4 43-9-1q-7-1-6-9l3-26q1-9 7-8Z" />
    <path className="margin-line" d="M183 149c23 5 26 25 7 33-21 9-9 26 5 29" />
    <g className="margin-motion margin-note">
      <path className="margin-line" d="m183 65 1-23 18-4 1 22m-19-11 18-4" />
      <ellipse className="margin-gold" cx="179" cy="67" rx="7" ry="5" />
      <ellipse className="margin-gold" cx="198" cy="61" rx="7" ry="5" />
    </g>
    <path className="margin-line" d="m35 71-8-4m16-3-2-8m147 146 8-2m-127 62 15-2" />
    <path className="margin-pink" d="m34 168 3 8 9 3-9 3-3 9-3-9-8-3 8-3Z" />
  </>;
}

const drawings = { reader: Reader, traveler: Traveler, cat: Cat, plant: Plant, camera: Camera, headphones: Headphones };

export function MarginDrawing({ kind, className = "" }: { kind: MarginDrawingKind; className?: string }) {
  const Drawing = drawings[kind];
  return <svg className={`margin-drawing margin-drawing--${kind} ${className}`} viewBox="0 0 240 260" aria-hidden="true" focusable="false">
    <Drawing />
  </svg>;
}
