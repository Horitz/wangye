# 导入整理后的攻略

## 自定义标签与本批补充（1.44）

指南／通知文档与社区帖子都支持可选 `tags: string[]`，例如 `"tags": ["МГУ", "学习 · Учёба"]`。共享 `src/lib/content-tags.mjs` 对编辑器、API 和导入执行同一规则：最多 8 个标签，每个最多 24 个 Unicode 码点；NFKC、去前导井号、去首尾并合并连续空白、忽略大小写去重后保留第一种写法。空标签省略，非法类型、NUL、超长或超量值拒绝，不截断后悄悄保存。

标签不是 `{ zh, ru }` 字段。中俄界面显示同一条用户原文，不自动翻译；需要时由编辑者填写中俄合写标签。旧清单可以完全省略 `tags`，无需迁移或批量覆盖旧文章；已有内容编辑请求省略该字段时保留原标签，显式 `[]` 才清空。导入器仍只新增，不能借修改清单为已有文章补标签；已有指南使用管理员编辑器维护。

2026-11-17 本批清单为 `content/imports/shares-2026-11-guides.json`（8 篇攻略）和 `content/imports/shares-2026-11-community.json`（4 篇社区文章），已经实际写入。重新检查或应用使用原导入器：

```powershell
npm.cmd run content:import -- content/imports/shares-2026-11-guides.json --dry-run
npm.cmd run community:import -- content/imports/shares-2026-11-community.json
npm.cmd run content:import -- content/imports/shares-2026-11-guides.json
npm.cmd run community:import -- content/imports/shares-2026-11-community.json --apply
```

前两条只检查；后两条分别按下方规则一致备份并事务写入，不是跨两个清单的同一个事务。重复导入保留已有稳定 ID，社区冲突仍须处理，不能覆盖管理员修改。批次维护脚本 `output/v144/import-shares.mjs` 默认预览，`--apply` 才执行，使用当前项目 `.data`；它额外比较旧文章 payload 与精选，并记录现有社区图片哈希。

初次导入记录见 `output/v144/import-applied.json`：新增 8／4 篇，无跳过或冲突。数据库指南行数由 10 增至 18，公开目录加上 7 篇内置概览，共 25 篇；社区由 18 增至 22 篇，其中 12 篇原示例、10 篇编辑整理。随后根据用户反馈执行定向修订，当前结果以以下记录为准：

- `output/v144/community-revision-applied.json`：已重写全部 10 篇编辑整理社区文章的双语正文与相应标题／图注；其中 4 篇改为独立选题并引用新增照片。当前两批社区清单共引用 12 张照片，路径及文件哈希均无重复；旧图片文件、稳定帖子 ID 和个人互动保留，新增照片附有对应许可信息。相关官方来源按新主题核对，原研究记录保留。
- `output/v144/guide-intros-applied.json`：8 篇新攻略中的 6 篇只更新双语 `summary`，其余字段不变。原 104 张不同指南配图、App 顶部及正文既有图库不调整。
- 上述定向更新均在 SQLite 一致备份后应用，保留无关文章字段、个人清单、用户互动和精选配置；社区「发现」流与当前精选的去重仅调整展示，不改精选记录。普通导入器仍只新增或报告冲突，清单更新不会自动覆盖已入库文章。

每次写入的私有备份路径列在相应记录内，勿复制到 `public`。

标签的创建／编辑／发布、公开目录、缓存与搜索筛选使用相同字段。界面复用 `TagEditor`、`ContentTags`、`TagFilter`；指南总目录可跨分区按标签找文章，分区页限定本区，社区结合学校／主题／视图。筛选写入 URL 并保留其他查询，用户标签不因界面语言改变；此功能不改变导入权限、每校精选上限或个人记录保存范围。检查记录在 `output/v144/checks`：119 项相关测试（109 项数据层＋10 项标签组件）、类型检查和隔离生产构建通过，完整 lint 最终复核通过（退出 0，无警告）。实际浏览器已检查中俄 360／768／1440px 社区列表／详情、指南分区、社区编辑器与管理员指南编辑器；无横向溢出，标签 URL／语言保留、新建／编辑持久化和重复规范化通过。待输入标签首次点击保存修复后，在 360px 完成首次提交与刷新确认。

## 社区图文（1.42）

校园活动与城市风景使用独立的 `content/imports/community-2026-11.json`，不会写入指南表：

```powershell
npm.cmd run community:import -- content/imports/community-2026-11.json
npm.cmd run community:import -- content/imports/community-2026-11.json --apply
```

第一条默认只检查；第二条先一致备份再事务插入。支持 `--data-dir` 指定隔离数据目录。相同 ID 内容相同会跳过，内容不同会列入 `conflictIds` 并保留站点现有内容；导入不会修改精选、收藏或评论。

清单为 `{ "version": 1, "posts": [...] }`。帖子使用独立中俄标题／正文、整理署名、学校和主题，图片位于 `public/media/community/`，每组最多 24 张，最长边 3200px。导入器核对本机文件、格式和实际尺寸；图注为双语，图片许可信息使用 `credit`，相关学校入口使用 `sources`。不把图片编码塞进全站帖子缓存。当前此入口为维护导入，个人笔记编辑器尚未增加图片上传。

## 指南与攻略

导入器把已整理的双语攻略写入网站使用的 SQLite，之后可在原阅读浮窗中由管理员编辑。它只新增缺失的文章，已有 ID 的正文、配图和管理员修改完整保留；不改个人记录、社区帖子、账号或好友消息。

默认文件为 `content/imports/xhs-2026-11.json`，根节点是 `EditorialDocument` 数组。先检查，再导入：

```powershell
npm.cmd run content:import -- --dry-run
npm.cmd run content:import
```

指定其他清单或数据目录：

```powershell
npm.cmd run content:import -- content/imports/another-batch.json --dry-run --data-dir C:\StudentPathData
npm.cmd run content:import -- content/imports/another-batch.json --data-dir C:\StudentPathData
```

数据目录优先使用 `--data-dir`，其次为 `STUDENTPATH_DATA_DIR`，否则为项目 `.data`。必须与网站使用的目录一致。预检查不创建数据库、目录或备份；输出 `pending` 为将新增的数量，`skipped` 为已存在的数量。

每篇文章使用固定的小写 `guide-UUIDv4`，归入现有七个分区之一；每个段落保留自己的稳定 ID，`legacyIndex` 为 `0`。标题和段落标题必须含中俄版本。正文、材料、地点、地址、要求和来源沿用网站现有字段及校验，不添加新分区或覆盖原七篇指南。公开来源使用 `{ label: { zh, ru }, url }`，仅保留已核实的学校等官方页面；署名使用用户指定的笔名。原始笔记链接和整理过程仅保存在内部研究记录中，不展示在网站公开来源区。

配图使用 JPEG data URL，每组最多 24 张，最长边不超过 3200px、每张编码不超过 1200000 字符、说明不超过 160 字符；单篇保存请求不超过 32MiB。限制统一来自 `src/lib/guide-media-limits.mjs`。远程链接和本地文件路径不能直接用作配图；先将有权使用的图片处理后填入清单。地址保留俄语原文，中文界面的地址字段也使用同一俄语文字。

整批文件通过验证后才开始写入；重复 ID、非法分区、缺少必填语言或非法图片会终止整批导入。写入在同一事务内完成，失败回滚。重复执行跳过已有文章，不覆盖管理员后续修改；要修改已有文章，请使用网站管理员编辑器。

存在新增文章时，导入器先通过 SQLite `VACUUM INTO` 在数据目录的 `backups` 中生成完整一致备份，包含已提交的 WAL 内容。备份失败则不导入；没有新文章或预检查时不备份。输出给出本次备份路径。备份包含网站私有数据，继续放在数据目录中，不放入 `public` 或版本库。

这是一份独立数据库备份。需要恢复时，先停止使用该数据库的服务并保留原数据目录；把备份复制到新的私有数据目录，命名为 `studentpath.sqlite`，将网站和维护命令的 `STUDENTPATH_DATA_DIR` 指向该目录后再启动。不要把独立备份与原目录的 `-wal`／`-shm` 文件混用。它恢复整站数据库，不恢复浏览器内的个人记录。

2026-11-17 的 1.40 图片补充把默认清单更新为 10 篇、104 张图片。已有站点通过一次限定 ID、图片数组和地址字段的维护迁移更新，保留管理员其他文字及个人记录；备份与验证见 [1.40 图库补充记录](research/gallery-v140.md)。普通 `content:import` 仍只新增，不会因为清单文件变动而覆盖已有文章。

1.41 保留上述全部 104 张不同图片。App 顶部收齐 14 张连续浏览，并保留正文配图；社会卡和 ОКО 的图片归属与顺序按对应流程归位。未重新编码或删减图片。维护脚本 `output/v141/repair-app-gallery.mjs`、`output/v141/repair-guide-image-order.mjs` 默认预检查，只有 `--apply` 才在一致备份后写入；普通导入器仍不覆盖已有文档。
