# 生活小提醒 · 龙娘配图

互动姿势 `dragon-coin.webp` 和 `dragon-castle.webp` 用同一原图作角色参考，由内置 imagegen 生成透明双格插画后切分。前者抱着星纹金币，后者坐在三块城垛上向下张望。角色的翼尖直接从当前姿势图分层绘制。

2026-11-20 使用内置 imagegen，以原透明角色图为参考生成四格表情图，分别裁为 `public/illustrations/dragon-{happy,pout,sleepy,surprised}.webp`。四种透明 WebP 对应挥手笑、鼓脸抱书、闭眼打呵欠和星星眼惊讶。网页按当前对白切换，原 PNG 用于待机与讲解生活提醒。

- 资产：`public/illustrations/life-tips-dragon.png`
- 生成方式：内置 `image_gen`，2026-11-17；透明 PNG，保留原始 alpha。
- 原始尺寸：1199 × 1312px，1,632,221 字节；原图复制到公开资产目录，未做裁切或二次压缩。
- 用途：留学生活页「生活小提醒」的 Q 版角色插画。参考用户提供的白发龙娘图，保留白发、龙角、紫眼、小翅膀与尾巴的识别元素，使用本站紫／青／黄配色点缀。
- 不含文字、商标或官方身份标记；文字提示由可编辑的网页内容呈现，不烘焙进图片。
- 用户参考图只作为生成参考，不复制到网站公开目录。

## 最终提示词

Use case: stylized-concept. Asset type: transparent-background character illustration for the StudentPath student life website. Reference images are character design and chibi style references only. Create one polished original fan-art-style chibi white-haired dragon girl inspired by the supplied references: fluffy silver-white hair, two delicate ivory curved horns, small pointed ears, lavender eyes, small pale lavender dragon wings and curled fluffy/scaled white tail. Cute friendly study companion with an expressive warm smile. Full body, seated or standing compact 3-head proportions, holds a small lilac notebook in one hand and lightly points upward with the other as if sharing a useful everyday tip. A modest white and pale lavender long-sleeve outfit, pastel teal ribbon detail and small golden star pin, soft boots; fully clothed, no revealing cutouts. Clean delicate ink linework, gentle cel shading, soft white/lavender palette fitting an ivory website with purple #694884, lilac #A58AE8, teal #79BDB5 and small gold #F5D547 accents. Single character, centered, very tight composition with a small transparent safety margin; whole horns, wings, tail, and boots visible. Face legible when displayed at 160px. True transparent background with alpha, no backdrop or ground plane, no external shadow. No words, no text, no lettering, no logo, no OpenAI knot motifs, no watermark, no UI or border. No additional characters. Make this a usable character asset, not a screenshot or poster.
