# Vercel + Supabase 免费版部署

更新时间：2026-11-17。

本方案保留现有 Next.js 页面、服务端接口和管理员编辑功能，由 Vercel 运行网站，Supabase 保存数据库与站点图片。GitHub 只保存源码，目标仓库是 [Horitz/wangye](https://github.com/Horitz/wangye)，不启用 GitHub Pages 静态托管。

**Supabase 初始化、真实数据迁移与 Vercel 正式部署已于 2026-11-17 完成。** 正式网址为 [wangye-opal.vercel.app](https://wangye-opal.vercel.app)。部署所需的生产构建成功；本次发布 `main` 提交 [08d6974](https://github.com/Horitz/wangye/commit/08d6974d4de6199658eb8b06f8e04790b6c232a7)，Vercel 部署耗时 42 秒，[本次部署地址](https://wangye-fehdth6iw-q3544790970-4900s-projects.vercel.app)已生成。

原 SQLite 未修改，旧会话未迁移，未运行独立测试、类型检查、lint 或浏览器总回归。下方操作步骤保留作维护说明；当前项目已经有业务数据，不要再次运行实际导入。部署成功不代表网站各项功能已经验收。

部署后完成的最小只读确认：

- 浏览器中的正式首页正常显示。
- `GET /api/content` 返回 200，包含 19 条 `summaries`。
- 抽查一张封面：两次 307 跳转后，Supabase 返回 200、`Content-Type: image/jpeg`，图片为 206194 字节。
- 不带 Cookie 的 `GET /api/admin/session` 返回 200，状态为 `authenticated:false`、`configured:false`；这是首次部署时的状态。

上述操作没有创建账号、修改站点内容或发送消息，只确认上线入口和一条图片读取链路，不替代功能及页面总回归。

本次实际迁入的记录：

| 数据 | 数量 |
| --- | ---: |
| 管理员 | 0 |
| 成员／成员资料 | 各 1 |
| 好友关系／聊天消息 | 各 0 |
| 社区内容 | 22 |
| 精选关系 | 9，分属不同学校 |
| 指南／站点内容记录 | 19 |
| 原站点元数据 | 1 |
| 上传到 Storage 的图片 | 112 |

迁移另外写入云迁移标记。目前已单独创建管理员并在正式域名验证登录和退出。通过[个人中心的管理员入口](https://wangye-opal.vercel.app/me#admin)维护内容。数据保存成功不代表登录、阅读、编辑和聊天已经完成网站运行验收。

## 1. 使用哪些服务

| 内容 | 保存位置 |
| --- | --- |
| 页面、SSR、`/api` 服务端接口 | Vercel 的 Next.js 应用 |
| 管理员、成员、资料、好友、聊天、指南、社区和站点文案 | Supabase PostgreSQL 的私有 `studentpath` schema |
| 发布到网站的上传图片 | Supabase Storage 的公开 `studentpath-media` bucket |
| 源码内已有的静态图片、字体和装饰 | 项目 `public` 目录，随网站部署 |
| 浏览器里的个人笔记、收藏、清单等已有本机记录 | 保留原浏览器存储，不由迁移脚本自动上传 |

网站继续使用现有“用户名 + 密码”、scrypt 密码哈希和 HttpOnly 会话 Cookie。成员和管理员权限保持独立；**不需要启用 Supabase Auth，也不需要配置 Google 登录给网站用户使用**。

数据库由 Next.js 服务端直接连接。`studentpath` 不开放给浏览器 Data API；迁移文件开启 RLS，并撤销公开 API 角色的访问权限。Storage 图片可以公开读取，写入仍经过网站管理员认证。

## 2. 在 Supabase 取得连接信息

使用项目 [xxlkpvzeeqrwccetynnu](https://supabase.com/dashboard/project/xxlkpvzeeqrwccetynnu)。项目网址为：

```text
https://xxlkpvzeeqrwccetynnu.supabase.co
```

### 数据库连接

1. 进入项目，点击页面上方 **Connect**。
2. 选择 **URI** 格式和 **Session pooler**，确认端口是 **5432**。
3. 复制整条 URI，替换其中的数据库密码占位符。数据库密码不是 Supabase 登录密码，也不是 API key。
4. 保留面板给出的主机名，不自行拼接地区。用户名通常是 `postgres.xxlkpvzeeqrwccetynnu`。

结构示例，仅用于辨认字段：

```text
postgresql://postgres.xxlkpvzeeqrwccetynnu:URL编码后的数据库密码@面板给出的主机名:5432/postgres
```

密码中的 URI 保留字符必须进行 URL 编码，例如 `@` → `%40`、`#` → `%23`、`%` → `%25`。只编码密码部分，不要编码整条 URI；不要把密码粘贴到在线编码工具里。

本项目选 Session pooler，是因为当前 postgres.js 驱动的查询流水线与 Supabase shared transaction pooler 有兼容问题。不能简单把地址换成 `6543`，也不能用 `max_pipeline: 0` 解决；该设置会影响 `sql.begin()`。连接池采用每个运行实例最多 1 条连接，并保留 TLS 证书校验。参见 [Supabase 连接说明](https://supabase.com/docs/guides/database/connecting-to-postgres)与 [Postgres.js 说明](https://supabase.com/docs/guides/database/postgres-js)。

### 数据库证书

Supabase 数据库使用自己的 CA，系统默认证书列表不一定包含它。项目已内置从 [Supabase 控制台官方配置](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json) 指定地址下载的公开 `Supabase Root 2021 CA`，有效期至 2031-04-26。它只用于 Supabase 数据库域名；连接始终保留证书链与主机名校验，不使用 `rejectUnauthorized: false`。

如果 Supabase 后续更换根证书，从 **Database → Settings → SSL Configuration → Download certificate** 取得新的 PEM，将完整证书填写到服务端 `SUPABASE_DB_CA_CERT`（可使用实际换行或 `\n`），本机和 Vercel 同步更新后重新部署。正常使用内置证书时该变量留空即可。证书是公开信任材料，不是数据库密码；不要通过关闭 TLS 验证处理 `SELF_SIGNED_CERT_IN_CHAIN`。参见 [Supabase SSL 说明](https://supabase.com/docs/guides/platform/ssl-enforcement)。

### 图片存储密钥

1. 打开项目 **Settings → API Keys**。
2. 取得服务端 **Secret key**，填到 `SUPABASE_SECRET_KEY`。
3. 如果项目只提供旧密钥，使用旧版 `service_role` key，变量名为 `SUPABASE_SERVICE_ROLE_KEY`；两种方式选一种即可。

`publishable` 或 `anon` key 不能代替这里的服务端密钥。数据库 URI、Secret key 和 `service_role` key 都只放本机私有配置或 Vercel 环境变量，不写入源码、不提交 GitHub，也不使用 `NEXT_PUBLIC_` 前缀。

## 3. 填写本机环境变量

在项目根目录的 `.env.local` 中填写。已有 `SUPABASE_URL` 时保留，补齐另外两项，不覆盖其他本机配置：

```dotenv
DATABASE_URL="从 Connect 复制并填好密码的 Session pooler URI"
SUPABASE_URL="https://xxlkpvzeeqrwccetynnu.supabase.co"
SUPABASE_SECRET_KEY="服务端 Secret key"
```

使用旧版密钥时，将最后一行替换为：

```dotenv
SUPABASE_SERVICE_ROLE_KEY="旧版 service_role key"
```

本机 `.env.local` 不需要设置正式网站的 `STUDENTPATH_ORIGIN`，本地开发会使用允许的回环地址。`.env.local`、`.data`、SQLite 文件和数据库备份均不提交到 GitHub。

## 4. 初始化与迁移已有站点

在本机项目目录使用 **Node.js 24**。以下是首次配置步骤；本项目的 `db:init` 和实际迁移已经完成：

```powershell
npm ci
npm run db:init
```

`db:init` 创建私有数据表与 `studentpath-media` bucket。它不清空现有表、不删除图片，也不自动创建管理员。

如果需要把当前本机站点搬到 Supabase，先完成迁移，再创建新账号：

可以先只查看各表待迁移数量；此模式不连接云端、不上传图片，也不输出账号哈希或消息正文：

```powershell
npm run db:migrate:site
```

确认连接的是目标空项目后，再执行实际迁移：

```powershell
npm run db:migrate:site -- --apply
```

迁移内容包括已保存的站点文案、指南、社区内容、站点图片、管理员、成员资料、好友关系和聊天记录；保留已有 ID、密码哈希和关联关系。原 SQLite 以只读方式打开，不删除、不修改原文件。

脚本默认读取 `.data`，或环境变量 `STUDENTPATH_DATA_DIR` 指定的目录；需要读取其他完整数据目录时，使用 `--source "数据目录的完整路径"`。目录中应保留 `studentpath.sqlite` 及 `community-media` 原图。

旧会话和限流记录不迁移，迁移后需要重新登录。浏览器 localStorage／IndexedDB 里的个人记录不会由此命令自动上传。

迁移只面向尚未写入业务数据的云数据库；发现非空目标时会停止，避免覆盖已有内容。因此不要先在云站点注册账号或运行 `admin:create`，然后再导入本机数据。迁移不是日常同步命令，不要把它加入 Vercel 的构建步骤。

图片先按内容哈希上传，再提交数据库事务；中途失败可能留下尚未被文章引用的 Storage 图片。修正问题后重试会复用相同哈希图片，不覆盖原文件；数据库记录在事务中整体提交。迁移完成前保持云站点未开放写入，避免注册、发帖或编辑与导入同时进行。

如果没有要迁移的本机数据，或迁移后仍没有管理员，再运行：

```powershell
npm run admin:create
```

按终端提示输入用户名和两次密码；密码输入不会显示。配置了 `DATABASE_URL` 时，这个命令创建的是当前 Supabase 数据库里的管理员。已有管理员无需重复创建；普通成员仍通过网站注册。

## 5. 把源码连接到 Vercel

用户已授权使用 [Horitz/wangye](https://github.com/Horitz/wangye)。先将项目源码推送到该仓库，排除本机配置、数据库、备份和 `.next` 构建目录。

Vercel 用 Google 账号登录不影响部署 GitHub 仓库：

1. 在 Vercel 点击 **Add New → Project**。
2. 在 **Import Git Repository** 区域连接 GitHub。
3. 授权 Vercel 访问 `Horitz/wangye`，然后选择该仓库的 **Import**。
4. Framework Preset 选择 **Next.js**，Root Directory 使用项目根目录。
5. 在项目设置确认 **Node.js Version = 24.x**。
6. 安装使用 `npm ci`；构建使用项目默认的 `npm run build`。不要填写静态导出目录 `out`，也不要启用 `output: export`。

在 Vercel 项目的 **Settings → Environment Variables** 填写：

| 变量 | 值 | 使用环境 |
| --- | --- | --- |
| `DATABASE_URL` | Session pooler `5432` 的完整数据库 URI | Production；需要预览时同时配置 Preview |
| `SUPABASE_DB_CA_CERT` | 通常留空；仅更换 CA 时填写官方完整 PEM | 与数据库环境一致 |
| `SUPABASE_URL` | `https://xxlkpvzeeqrwccetynnu.supabase.co` | Production / Preview |
| `SUPABASE_SECRET_KEY` | 服务端 Secret key | Production / Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅使用旧版密钥时填写，与上一项二选一 | Production / Preview |
| `STUDENTPATH_ORIGIN` | 最终站点 origin，例如 `https://你的站点.vercel.app`，不带路径 | 确定域名后设置 |

首次部署可以暂不填写 `STUDENTPATH_ORIGIN`，网站会使用 Vercel 自动提供的部署地址。后续绑定自定义域名时，将该变量设置为实际 HTTPS origin，并重新部署。环境变量变更后也需要重新部署才会应用。

Preview 若填写同一组 Supabase 凭据，就与正式站共享账号、帖子和消息；它不是隔离的测试环境。日后需要写入式验收时，为 Preview 配置独立数据库与 Storage，不在正式数据上做测试。

完成环境变量后点击 **Deploy**。Vercel 会执行生产构建，这是生成可部署网站的必要步骤。本项目已于 2026-11-17 完成此步骤，生产构建与正式部署成功；后续修改环境变量或源码时按需重新部署，不把这次构建结果延用为未来版本的验收结果。

## 6. 免费版容量

截至 2026-11-17，Supabase Free 提供 **500 MB 数据库、1 GB 文件存储**，项目在 **连续一周无活动后会暂停**。站点图片较多时主要关注 Storage 使用量，文章和聊天记录主要占数据库空间。费用和限额以后以 [Supabase 官方价格页](https://supabase.com/pricing)为准。

若项目被暂停，在 Supabase 控制台恢复后再使用网站。

## 7. 待验证，暂不执行

用户目前暂停总回归测试。数据库与 Storage 已在真实迁移中连接并写入成功，Vercel 必要生产构建及正式部署已完成；以下网站功能验收仍未执行：

- 生产环境变量在各项实际业务调用中是否正确生效。
- 全部指南／社区文章及各图库的完整加载、展示与交互；已抽查的单张封面不代表完整图库验收。
- 管理员和普通成员的登录、退出、会话过期及权限隔离。
- 管理员发布、编辑、加精内容，以及图片上传、读取与保留原图。
- 好友申请、接收、移除，聊天分页、幂等发送及跨用户隔离。
- 页面、双语布局、指南浮窗和个人中心的完整回归。

待用户明确要求测试后，在独立测试环境使用专用账号和内容执行；不要通过改写真实站点文章、添加真实好友或发送真实聊天消息来验收。
