# 太史书

一个面向《史记》的静态数字阅读器。当前版本提供篇章阅读、人物/地名标注、人物关系、现代地图位置、可选访问统计和章末推广位；项目面向 Cloudflare / Vercel 这类静态或 Serverless 部署环境，不再使用运行时数据库，也不提供在线修改功能。

## 本地运行

需要 Node.js 22.5 或更高版本。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

生产构建：

```bash
npm run build:reader-data
npm run build
npm start
```

## 当前技术结构

- Next.js 15、React 19、TypeScript
- App Router，首页静态生成，阅读交互在客户端完成
- Leaflet 地图引擎与 OpenStreetMap 现代底图
- 所有阅读内容、人物、地名、关系都来自 JSON 文件
- 可选的百度统计、访问次数和章末推广位通过环境变量控制
- 不使用 SQLite、D1、KV 或其他运行时数据库

## JSON 数据源

核心数据文件位于 `data/`：

- `data/chapters.json`：十二本纪正文、段落和实体标注
- `data/entities.json`：人物与地名配置，包括类型、别名、介绍、位置和来源链接
- `data/relations.json`：人物关系配置
- `data/reader-data.json`：由上述 JSON 生成的兼容快照

重新生成快照：

```bash
npm run build:reader-data
```

生成脚本位于 `scripts/build-reader-data.mjs`，会校验：

- 标注是否引用了存在的实体；
- 人物 / 地名类型是否有效；
- 人物来源是否来自中文维基百科；
- 地名是否误用了人物词条介绍。

## 实体来源规则

人物介绍原则上采用中文维基百科，并在详情面板显示来源链接。地名也优先采用中文维基百科，但同名词条必须确认是地理对象；如果中文维基命中了同名人物或现代行政区口径不合适，就使用本地历史地名校注，并明确标注来源。

例如 `雷澤` 是《史记·五帝本纪》中的地名，项目将它配置为 `PLACE`，并使用地名校注说明，避免误用中文维基里的同名人物词条。

## 地图数据来源

- 现代底图：OpenStreetMap contributors，ODbL。
- 线上浏览器通过同域 `/api/map-tiles/...` 请求地图，Cloudflare Worker 负责获取并缓存瓦片，避免国内客户端直接访问 OpenStreetMap 瓦片域名。
- 古代区域数据：“秦代分郡地图”，来自[观沧海地图共享知识](https://ageeye.app.ditushu.com/map/37030459f79ae1e854f6391c8029cdbdffa40/)，作者 Circuare，CC BY-SA。
- `public/data/qin-east.geojson` 作为研究资料保留，当前阅读界面仅展示现代地图，不加载古代图层。

地图地址可通过环境变量调整：

```shell
NEXT_PUBLIC_MAP_TILE_URL=/api/map-tiles/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
MAP_TILE_UPSTREAM_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

`MAP_TILE_UPSTREAM_URL` 只在服务端使用，不会把上游域名或密钥暴露给浏览器。替换为商业或国内地图服务前，应确认授权条款、坐标系和署名要求。

## 访问统计与推广位

统计和推广默认关闭，只有在配置对应环境变量后才会启用。

```shell
BAIDU_TONGJI_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VISIT_COUNTER_PROVIDER=busuanzi
AD_CHAPTER_END_IMAGE_URL=/images/ad.jpg
AD_CHAPTER_END_TARGET_URL=https://example.com
AD_CHAPTER_END_ALT=推广内容
AD_CHAPTER_END_SPONSOR=合作推广
```

百度统计脚本只会在用户授权后加载。访问次数当前通过可选前端计数器展示；如果后续需要广告对账级别的数据，建议再接入自有服务端统计或广告平台后台报表。

## 部署到 Cloudflare

Cloudflare 部署不需要数据库文件。构建前先生成 JSON 快照：

```shell
npm run build:reader-data
npm run build
```

Cloudflare Workers / Pages 项目可继续使用 Next.js 自动构建预设。当前首页强制静态生成，运行时只读取打包进产物的 JSON 数据；地图瓦片代理仍通过 `/api/map-tiles/...` 提供。

Cloudflare 项目名使用 `shiji`，自定义域名绑定为 `shijis.xyz`，线上入口为 <https://shijis.xyz>，不使用额外的应用路径。
