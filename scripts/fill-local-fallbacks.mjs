import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const db = new DatabaseSync(path.join(root, "data", "shiji.db"));
const seedPath = path.join(root, "data", "seed", "entity-descriptions.json");
const geojson = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "qin-east.geojson"), "utf8"));
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const generated = new Map(seed.entities.map((entity) => [entity.name, entity]));
const now = new Date().toISOString();

const people = [
  {
    name: "后稷",
    summary: "周族始祖，名棄，传说中的农耕官。",
    details: "《周本纪》载，后稷名棄，母为姜原。棄善于耕作，帝堯举其为农师；帝舜命其播种百谷，封于邰，号后稷，别姓姬氏。周人尊其为始祖。",
    sourceUrl: "https://zh.wikisource.org/wiki/史記/卷004",
  },
  {
    name: "太康",
    summary: "夏代君主，夏后帝啟之子。",
    details: "《夏本纪》载，夏后帝啟去世后，其子太康继位。太康失国，其五位弟弟在洛水之滨等待，作《五子之歌》。太康去世后，由弟弟中康继位。",
    sourceUrl: "https://zh.wikisource.org/wiki/史記/卷002",
  },
  {
    name: "公劉",
    summary: "周族先祖，传说中推动周族复兴的首领。",
    details: "《周本纪》载，公劉继承后稷的事业，重视耕种，考察土地条件，自漆、沮渡过渭水，使行旅有资、居民有积蓄。百姓归附，周族由此逐渐兴盛。",
    sourceUrl: "https://zh.wikisource.org/wiki/史記/卷004",
  },
  {
    name: "周厲王",
    summary: "西周君主，名胡。",
    details: "《周本纪》载，周厲王名胡，为夷王之子。其在位期间任用荣夷公、实行专利，并压制国人议论，引发国人暴动。厲王出奔彘，周公、召公共同行政，史称共和行政。",
    sourceUrl: "https://zh.wikisource.org/wiki/史記/卷004",
  },
  {
    name: "陳平",
    summary: "西汉开国功臣、谋士和丞相。",
    details: "《高祖本纪》《吕太后本纪》多次记载陳平献策辅佐劉邦，并参与安定汉初政局。高祖认为陳平智谋有余，可辅佐王陵；吕后去世后，陳平与周勃等合谋诛除诸吕，迎立代王劉恒。",
    sourceUrl: "https://zh.wikisource.org/wiki/史記/卷008",
  },
  {
    name: "竇皇后",
    summary: "漢文帝皇后、漢景帝生母，后尊为竇太后。",
    details: "《孝文本纪》载，漢文帝即位后立太子之母竇氏为皇后。《孝景本纪》载，景帝为文帝中子，母为竇太后。竇太后崇尚黄老之学，对文景至武帝初年的政治产生重要影响。",
    sourceUrl: "https://zh.wikisource.org/wiki/史記/卷010",
  },
].map((entity) => ({
  type: "PERSON",
  ...entity,
  sourceName: "《史记》十二本纪（维基文库）",
  sourceUpdatedAt: now,
}));

const kindLabels = {
  city: "重要城邑",
  county: "县邑",
  province: "区域中心或重要城邑",
  mountain: "山岳",
};
const featureByName = new Map(
  geojson.features
    .filter((feature) => feature.geometry?.type === "Point" && feature.properties?.name)
    .map((feature) => [feature.properties.name, feature]),
);
const wrongWikipediaPlaces = new Set(["祁", "桃", "海盐", "豐邑", "东阳", "平阳", "乌江", "陽城", "南城", "谷城", "曲阳", "衡山"]);
const placeRows = db.prepare(`
  SELECT id, type, name, summary, details, latitude, longitude
  FROM entities WHERE type = 'PLACE' ORDER BY id
`).all();
const places = [];
for (const place of placeRows) {
  const isPlaceholder = place.details.startsWith("本条目由") || place.summary.includes("十二本纪相关");
  if (!isPlaceholder && !wrongWikipediaPlaces.has(place.name)) continue;
  const feature = featureByName.get(place.name);
  const label = feature ? (kindLabels[feature.properties.icon] ?? "古地名") : "古地名";
  const coordinates = Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    ? `示意位置约为北纬 ${place.latitude.toFixed(3)}°、东经 ${place.longitude.toFixed(3)}°。`
    : "具体位置尚待考证。";
  const fromMap = Boolean(feature);
  places.push({
    type: "PLACE",
    name: place.name,
    summary: `${place.name}，秦汉时期${label}。`,
    details: `${fromMap ? "据项目采用的秦代历史地理数据" : "据《史记》正文与项目历史地名词典"}，${place.name}标注为${label}，${coordinates}该位置用于辅助阅读，不代表古城址或古地范围的精确考古结论；其古今沿革仍需结合地方志和考古资料校订。`,
    sourceName: fromMap ? "观沧海地图共享知识：秦代分郡地图" : "《史记》正文与项目历史地名词典",
    sourceUrl: fromMap
      ? "https://ageeye.app.ditushu.com/map/37030459f79ae1e854f6391c8029cdbdffa40/"
      : "https://zh.wikisource.org/wiki/史記",
    sourceUpdatedAt: now,
  });
}

const update = db.prepare(`
  UPDATE entities
  SET summary = ?, details = ?, source_name = ?, source_url = ?, source_updated_at = ?
  WHERE type = ? AND name = ?
`);
db.exec("BEGIN IMMEDIATE");
try {
  for (const entity of [...people, ...places]) {
    update.run(
      entity.summary, entity.details, entity.sourceName, entity.sourceUrl,
      entity.sourceUpdatedAt, entity.type, entity.name,
    );
    generated.set(entity.name, entity);
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

const result = {
  source: "Wikimedia 官方 API、《史记》十二本纪与秦代历史地理数据",
  generatedAt: now,
  entities: Array.from(generated.values()).sort((a, b) => a.name.localeCompare(b.name, "zh")),
};
fs.writeFileSync(seedPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`补齐人物 ${people.length} 条、古地名 ${places.length} 条；种子文件共 ${result.entities.length} 条。`);
