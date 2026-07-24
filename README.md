# 太史书

一个面向《史记》的数字阅读器原型。当前版本提供篇章阅读、人物/地名标注、人物关系、古今位置占位展示，以及人物和地名说明的本地编辑与版本留痕。

## 本地运行

需要 Node.js 22.5 或更高版本（项目当前使用 Node.js 24 的内置 SQLite）。

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
- Node.js 内置 SQLite，本地数据位于 `data/shiji.db`
- Leaflet 地图引擎与 OpenStreetMap 现代底图
- 服务端渲染阅读数据，客户端负责篇章切换、详情面板和编辑交互
- 实体说明更新通过 `/api/entities/:id` 写入数据库
- 每次保存前的说明会记录到 `revisions` 表

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

当前编辑接口尚未增加登录和权限控制，只适用于本地原型环境。

## 地图数据来源

- 现代底图：OpenStreetMap contributors，ODbL。
- 古代区域数据：“秦代分郡地图”，来自[观沧海地图共享知识](https://ageeye.app.ditushu.com/map/37030459f79ae1e854f6391c8029cdbdffa40/)，作者 Circuare，CC BY-SA。
- `public/data/qin-east.geojson` 作为研究资料保留，当前阅读界面仅展示现代地图，不加载古代图层。 

## 部署到 Vercel

项目可直接导入 Vercel，框架预设选择 Next.js，构建命令和输出目录保持默认即可。仓库中的 `data/shiji.db` 是部署所需的只读数据快照，必须一同提交。

Vercel 会自动设置 `VERCEL=1`。在该环境下：

- SQLite 数据库以只读方式打开；
- 实体说明编辑入口会隐藏；
- 编辑 API 会返回 `403`，避免把临时文件系统误当作持久化存储。

本地运行仍保留实体编辑与修订记录。如果需要在其他只读环境中模拟线上行为，可运行：

```bash
SHIJI_READ_ONLY=1 npm run dev
```

若线上需要开放编辑，应先把实体和修订数据迁移到 Vercel Postgres、Neon 等持久化数据库，并增加身份认证与权限控制。
