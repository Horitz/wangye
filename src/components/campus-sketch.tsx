/** Original, decorative campus doodle. All colours come from the shared palette. */
export function CampusSketch() {
  return <svg className="campus-sketch" viewBox="0 0 520 360" fill="none" aria-hidden="true" focusable="false">
    <g className="sketch-lines">
      <path className="sketch-ground" d="M37 321c57-4 108 3 158 0m19 1c87-6 165 4 252-1" />

      {/* A slightly wonky noticeboard, drawn as paper and pencil rather than UI. */}
      <path className="sketch-board-frame" d="m66 226-2 82q4 5 10 0l5-81m207-1 5 82q4 4 9-1l-1-82" />
      <path className="sketch-board" d="M40 59q-5 0-5 6l2 170q0 6 7 6l271-5q7 0 7-6l-2-165q0-6-6-6Z" />
      <path className="sketch-board-edge" d="M45 69q126-4 265 0l2 157q-136 2-265 4Z" />

      <g transform="rotate(-3 105 145)">
        <path className="sketch-paper" d="m59 84 87 2-1 128-83-3Z" />
        <path className="sketch-gold" d="m72 100 58 2-1 9-56-1Z" />
        <path className="sketch-fine" d="m73 122 44 1m-44 7 53 1m-53 7 36 1" />
        <path className="sketch-teal" d="m75 180 1-23 11 1 1-14 12 1 1 12 10-1 1 25" />
        <path className="sketch-lilac" d="m111 182 1-18 15-3 2 22Z" />
        <path className="sketch-fine" d="m72 183 60 1m-53 10 45 1m-32-30 1 7m9-7v7" />
        <circle className="sketch-pin" cx="102" cy="88" r="3.5" />
      </g>

      <g transform="rotate(4 204 137)">
        <path className="sketch-paper" d="m159 84 88-1 2 109-89 2Z" />
        <path className="sketch-map-fill" d="m171 97 22 5 23-6 21 6-2 69-20-4-21 8-22-6Z" />
        <path className="sketch-fine sketch-map-fold" d="m194 103-1 71m23-76-1 69" />
        <path className="sketch-route" d="M181 156c26-22 8-24 18-35s18 8 26-6" />
        <circle className="sketch-paper" cx="181" cy="156" r="4" />
        <path className="sketch-gold" d="M225 103c-7 0-10 8-6 13l6 7 6-7c4-6 1-13-6-13Z" />
        <circle className="sketch-ink" cx="225" cy="111" r="2" />
        <path className="sketch-fine" d="m173 183 34-1m9 0 18-1" />
        <circle className="sketch-pin" cx="201" cy="87" r="3.5" />
      </g>

      <g transform="rotate(-4 281 159)">
        <path className="sketch-lilac" d="m259 113 44-1 1 58-46 1Z" />
        <path className="sketch-paper" d="m268 128 23 1v24l-12-4-11 3Z" />
        <path className="sketch-fine" d="m279 130 1 16" />
        <path className="sketch-gold" d="m259 183 44 1-1 24-43-1Z" />
        <path className="sketch-fine" d="m267 193 27 1m-22 6 16 1" />
        <circle className="sketch-pin" cx="279" cy="114" r="3" />
      </g>

      {/* Student: relaxed jacket, backpack, oversized glasses and trainers. */}
      <path className="sketch-lilac" d="M407 164c22-4 35 9 37 30l2 52c-2 11-18 17-29 10l-15-19Z" />
      <path className="sketch-fine" d="m432 181 3 55q-1 8-10 9m7-40-12 1" />
      <path className="sketch-trousers" d="m360 236 55 2-7 70-19 1-5-48-6 49-20-2Z" />
      <path className="sketch-fine" d="m384 248 1 14m13 5-3 25m-29-26-1 22" />
      <path className="sketch-paper" d="m356 304 24 2 4 12q-19 7-39 2c-2-4 4-10 11-11Zm33 2 19-1 17 10q5 7-7 8l-31-2Z" />
      <path className="sketch-fine" d="m347 317 34-1m9 2 32 1m-58-9 5 4m28-3 5 4" />
      <path className="sketch-shirt" d="M368 158q18-8 33-1c17 9 26 28 28 53l-14 5 3 27q-29 10-62-2l4-34-15-9 6-28Z" />
      <path className="sketch-paper" d="m373 155 4 19 11 7 11-18-5-12Z" />
      <path className="sketch-fine" d="m375 167 12 17 15-21m-18 22 1 50m-28-30 6 15m34-19 14 1-1 14q-8 5-14-1Z" />
      <path className="sketch-ink" d="M406 165q10 16 13 37l-6 1q-2-21-11-36Z" />
      <path className="sketch-paper" d="m416 212 12-3 7 27q2 8-5 13l-9 5q-6 1-5-5l8-7-5-20Z" />
      <path className="sketch-fine" d="m420 246 7-5m-3-7 4 5" />

      <g className="campus-sketch-arm">
        <path className="sketch-shirt" d="m356 168-30-14-23-26-13 12q12 23 27 35l34 23Z" />
        <path className="sketch-fine" d="m299 137 9-9m20 29 7 15" />
        <path className="sketch-paper" d="m291 139-7-10-14-6q-8-5-2-9l11 3-10-15q-3-7 2-8 4 0 7 6l11 13 5 1 6 16Z" />
        <path className="sketch-fine" d="m278 115 7 6m1-16 4 7" />
      </g>

      <path className="sketch-paper" d="M368 95c-18 5-21 27-15 43s20 24 38 18c17-6 26-24 20-42s-25-26-43-19Z" />
      <path className="sketch-paper" d="M407 119c10-5 15 5 10 13q-3 5-9 2" />
      <path className="sketch-ink" d="M351 115q-11-17 2-29l-5-6 13 2q9-13 20-7l6-5 2 8q19-1 24 16 7 9-1 27l-7-1-1-18q-11 3-19-5c-5 8-17 10-24 8l-1 11Z" />
      <path className="sketch-hair-line" d="M359 91q13-8 24-5m7 1q11 1 15 10" />
      <path className="sketch-fine" d="m354 118-8 1m48-4 13 7" />
      <circle className="sketch-glasses" cx="361" cy="122" r="11" />
      <circle className="sketch-glasses" cx="388" cy="121" r="12" />
      <path className="sketch-fine" d="M372 122q3-3 5-1m-3 5-3 10 5 1m-9 7q10 7 19-3" />
      <ellipse className="sketch-ink" cx="360" cy="122" rx="1.6" ry="2.7" />
      <ellipse className="sketch-ink" cx="387" cy="121" rx="1.6" ry="2.7" />
      <path className="sketch-blush" d="m355 137 8-1m28-1 8-2" />

      {/* A patient little campus companion. */}
      <g className="campus-sketch-dog-tail">
        <path className="sketch-gold" d="M261 301c-19 1-33-7-29-25 1-7 8-9 9-2 1 13 11 14 26 13Z" />
        <path className="sketch-fine" d="M239 279q2 12 14 12" />
      </g>
      <path className="sketch-gold" d="M277 251q-16 13-17 33-17 9-12 25 19 12 52 2l10-14-12-40Z" />
      <path className="sketch-paper" d="M287 265q14 8 12 28l2 17-18 1 3-14-7-20Z" />
      <path className="sketch-gold" d="M277 237q10-13 25-4l11 14-2 19q-9 11-25 4l-12-13Z" />
      <path className="sketch-gold" d="M283 239c-15-9-22-3-17 14l6 13q7 3 8-7l3-15" />
      <path className="sketch-paper" d="m302 245 15 1q8 1 7 9-3 10-17 8l-11-4" />
      <path className="sketch-ink" d="M317 246q9-2 8 4-1 5-7 5l-3-4Z" />
      <circle className="sketch-ink" cx="299" cy="244" r="2" />
      <path className="sketch-fine" d="m309 256q0 6-6 6m-29 24q-12 1-12 15m15 8 1-14m11 14 2-8" />
      <path className="sketch-teal" d="m282 268 23 1-1 6-24-1Z" />
      <circle className="sketch-gold" cx="300" cy="278" r="4" />

      <g className="campus-sketch-star">
        <path className="sketch-gold" d="m451 89 4 13 13 4-13 4-4 13-4-13-13-4 13-4Z" />
        <path className="sketch-fine" d="m465 80 2 9m-4-5 8 1" />
      </g>
      <path className="sketch-fine sketch-scribble" d="m40 276-8 6m12 3-4 9m99 18 5-8 3 8m-12-3 17-1M335 46l3-9m6 14 9-4" />
      <path className="sketch-pink" d="m444 263 8 6-3 10-10-1-2-9Z" />
      <path className="sketch-fine" d="m175 41 7-3 7 4-4 7-8-1Z" />
    </g>
  </svg>;
}

export type SketchStickerKind = "book" | "compass" | "chat";

export function SketchSticker({ kind }: { kind: SketchStickerKind }) {
  return <svg className={`sketch-sticker sketch-sticker--${kind}`} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <path className="sketch-sticker-paper" d="M12 6q20-4 41 4 7 17 3 38-18 13-42 8Q4 36 12 6Z" />
    {kind === "book" ? <g className="sketch-sticker-line">
      <path className="sketch-paper" d="M15 20q10-4 17 2 9-7 18-3l-1 26q-10-3-17 2-8-5-18-2Z" />
      <path d="m32 23 1 23M19 26q5-1 8 1m-8 5q4-1 8 1m10-7 8-2m-8 8 7-2" />
      <path d="m21 13-2-5m7 5 1-6" />
    </g> : kind === "compass" ? <g className="sketch-sticker-line">
      <path className="sketch-paper" d="M48 22c8 12-1 29-16 29-17 0-24-17-15-29 8-10 23-10 31 0Z" />
      <path className="sketch-lilac" d="m39 25-5 13-12 5 5-13Z" />
      <path d="m28 31 5 6m0-19v3m14 12-3 1m-12 13v-3m-15-11h3M32 7v6m-3-5 7 1" />
    </g> : <g className="sketch-sticker-line">
      <path className="sketch-paper" d="M13 18q14-4 30 0l1 19-16 1-9 8 1-9-7-1Z" />
      <path d="m45 26 7 1-1 21-9-1-6 5-1-8-8-1m-7-19 15 1m-15 5 10 1" />
      <path d="m47 12 3-5m2 10 6-3" />
    </g>}
  </svg>;
}
