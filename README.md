# 太史书

一个面向《史记》的数字阅读器原型。当前版本提供篇章阅读、人物/地名标注、人物关系、古今位置占位展示；线上阅读使用只读数据快照。

站点还预留了访问统计和章末推广位：百度统计只会在用户明确同意后加载，且会尊重浏览器的 Do Not Track / Global Privacy Control 设置；章末推广位只有在环境变量完整配置时才会显示。

## 本地运行

需要 Node.js 22.5 或更高版本；SQLite 仅用于本地数据维护和快照导出。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

生产构建：

```bash
npm run build
npm start
```

## 当前技术结构

- Next.js 15、React 19、TypeScript
- Node.js 内置 SQLite，本地维护源位于 `data/shiji.db`
- Leaflet 地图引擎与 OpenStreetMap 现代底图
- 静态构建阅读数据，客户端负责篇章切换和详情面板交互
- `data/reader-data.json` 作为云端部署快照
- 每次保存前的说明会记录到 `revisions` 表
- 可选的百度统计和章末推广位通过环境变量控制

## 原型数据

当前已收录十二本纪全文，共 782 段、约 9.4 万字。正文来自维基文库《史记》（CC BY-SA 4.0），并固化在 `data/seed/twelve-benji.json` 中。标注以段落内字符偏移保存，人物别名可统一指向同一实体。

## 自动生成实体介绍

人物和地名介绍可通过 Wikimedia 官方 API 批量生成：

```bash
npm run enrich:wikipedia
```

生成器只替换尚未校订的占位说明，不覆盖手工编辑内容。结果同时写入本地 SQLite 数据库和 `data/seed/entity-descriptions.json`，因此可以提交到代码仓库并在另一台电脑上通过数据库迁移恢复；详情面板会显示中文维基百科来源链接和生成日期。

## 下一阶段

1. 确定并导入可使用的《史记》底本全文。
2. 增加实体标注审核后台及批量导入校验。
3. 接入 MapLibre 与历史地图图层。
4. 增加登录、编辑权限、修订对比和回滚。
5. 部署前迁移到 PostgreSQL/PostGIS。

线上编辑接口暂未开放，当前部署面向只读阅读场景。

## 地图数据来源

- 现代底图：OpenStreetMap contributors，ODbL。
- 线上浏览器通过同域 `/api/map-tiles/...` 请求地图，Cloudflare Worker 负责获取并缓存瓦片，避免国内客户端直接访问 OpenStreetMap 瓦片域名。
- 古代区域数据：“秦代分郡地图”，来自[观沧海地图共享知识](https://ageeye.app.ditushu.com/map/37030459f79ae1e854f6391c8029cdbdffa40/)，作者 Circuare，CC BY-SA。
- `public/data/qin-east.geojson` 作为研究资料保留，当前阅读界面仅展示现代地图，不加载古代图层。

地图地址可通过环境变量调整：

```shell
# 浏览器请求地址，默认使用同域代理
NEXT_PUBLIC_MAP_TILE_URL=/api/map-tiles/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

# Worker 获取瓦片的上游地址；未设置时使用 OpenStreetMap
MAP_TILE_UPSTREAM_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

`MAP_TILE_UPSTREAM_URL` 只在服务端使用，不会把上游域名或密钥暴露给浏览器。替换为商业或国内地图服务前，应确认授权条款、坐标系和署名要求。

## 访问统计与推广位

统计和推广默认关闭，只有在你配置对应环境变量后才会启用。

```shell
# 百度统计站点代码
BAIDU_TONGJI_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 访问次数展示
VISIT_COUNTER_PROVIDER=busuanzi

# 章末推广位
AD_CHAPTER_END_IMAGE_URL=/images/ad.jpg
AD_CHAPTER_END_TARGET_URL=https://example.com
AD_CHAPTER_END_ALT=推广内容
AD_CHAPTER_END_SPONSOR=合作推广
```

其中 `AD_CHAPTER_END_IMAGE_URL` 支持站内相对路径或 `http(s)` 地址，`AD_CHAPTER_END_TARGET_URL` 必须是 `http(s)` 地址。统计脚本只会在用户授权后加载，因此未授权访问不会产生统计请求。

## 部署到 Cloudflare 或 Vercel

云端运行时不直接加载 SQLite。`data/shiji.db` 仅作为本地维护源，部署使用可被 Worker 和 Serverless 环境直接打包的 `data/reader-data.json` 快照。数据库内容更新后，先重新导出并验证构建：

```shell
npm run export:reader-data
npm run build
```

Cloudflare Workers 项目可继续使用 Next.js 自动构建预设。当前首页强制静态生成，因此线上请求不会加载 `node:sqlite` 或访问本地文件系统：

- 阅读数据来自 `data/reader-data.json`；
- 实体说明编辑入口隐藏；
- 编辑 API 固定返回 `403`；
- Vercel 部署使用同一份只读构建，无需单独配置 SQLite 文件追踪。

Cloudflare 项目名使用 `shiji`，自定义域名绑定为 `shijis.xyz`，线上入口为 <https://shijis.xyz>，不使用额外的应用路径。

若线上需要开放编辑，应将实体和修订数据迁移到 Cloudflare D1、PostgreSQL 等持久化数据库，并增加身份认证与权限控制。
