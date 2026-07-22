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

当前完整示例为《项羽本纪》开篇三段，另有三个篇目作为目录和空状态示例。标注以段落内字符偏移保存，人物别名可统一指向同一实体。

## 下一阶段

1. 确定并导入可使用的《史记》底本全文。
2. 增加实体标注审核后台及批量导入校验。
3. 接入 MapLibre 与历史地图图层。
4. 增加登录、编辑权限、修订对比和回滚。
5. 部署前迁移到 PostgreSQL/PostGIS。

当前编辑接口尚未增加登录和权限控制，只适用于本地原型环境。

## 地图数据来源

- 现代底图：OpenStreetMap contributors，ODbL。
- 古代图层：“秦代分郡地图”，来自[观沧海地图共享知识](https://ageeye.app.ditushu.com/map/37030459f79ae1e854f6391c8029cdbdffa40/)，作者 Circuare，CC BY-SA。
- 转换后的华东局部 GeoJSON 位于 `public/data/qin-east.geojson`，保留相同许可和署名。
- 转换脚本：`scripts/convert-ageeye.mjs`。
