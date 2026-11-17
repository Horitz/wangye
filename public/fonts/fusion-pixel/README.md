# Fusion Pixel for the landing title

This directory contains the **unmodified** Simplified Chinese proportional
12px font from [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font),
release [2026.11.10](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.11.10).
The same font includes the Russian glyphs used by the landing title.

## Asset and licence

- File: `fusion-pixel-12px-proportional-zh_hans.otf.woff2`
- Size: 694,824 bytes (about 679 KiB).
- Internal family: `Fusion Pixel 12px Prop zh-Hans`.
- Internal full name: `Fusion Pixel 12px Prop zh-Hans Regular`.
- Style and weight: normal, 400 (Regular).
- Format: WOFF2 containing OpenType/CFF outlines.
- Font licence: SIL Open Font License 1.1; the original release's `OFL.txt`
  and all bundled upstream notices in `LICENSES/` are retained verbatim.
- The font has not been subsetted, renamed, converted, or redrawn. No runtime
  CDN request or additional application dependency is required.

Use only for the accent text in the landing page heading. Keep the existing
Noto Sans SC/Noto Sans fonts as fallbacks and keep body text, navigation,
buttons, and workspace headings on the existing font system. Avoid synthetic
bold and italics: the intentionally square outlines provide the pixel shape.

## Source and integrity

Official release archive:

<https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.11.10/fusion-pixel-font-12px-proportional-otf.woff2-v2026.11.10.zip>

SHA-256 of that archive (verified against the GitHub release asset digest):

```text
4a0bab32ebb6ca0525f87024f3adbacf409a74b0fc8373d5345c93b1b7cbb075
```

SHA-256 of the unchanged font in this directory:

```text
4f0ccc75b874c97b79d0cbfa5babcd51d1fdc7da5be4ddc7f2895ccae3bc301d
```

To reproduce these assets, download the pinned archive, verify its checksum,
and extract the `fusion-pixel-12px-proportional-zh_hans.otf.woff2`, `OFL.txt`,
and `LICENSES/` entries without modifying them. No font build step is needed.

On 2026-11-17, the font's WOFF2 directory and Brotli stream were decoded with
Node's built-in `zlib`, then its `name` and Unicode `cmap` tables inspected.
All characters in `开启你的留学新生活。` and `в Москве.` (including the space)
map to nonzero glyphs; no fallback is needed for those exact phrases. The font
contains 38,213 Unicode mappings. The source project's broader coverage is
documented in its [12px proportional character report](https://github.com/TakWolf/fusion-pixel-font/blob/2026.11.10/docs/info-12px-proportional.md).

If future copy introduces other characters, verify their glyph coverage and
retain the normal text fallback. If a future asset is subsetted or otherwise
modified, preserve every licence notice and review the font naming conditions
in those licences before distributing the derivative.
