import fs from "node:fs";
import path from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  throw new Error("Usage: node scripts/convert-ageeye.mjs input.ageeye output.geojson");
}

const source = JSON.parse(fs.readFileSync(input, "utf8"));
const targetNames = new Set([
  "泗水郡", "会稽郡", "东海郡", "鄣郡", "九江郡", "砀郡",
  "下相", "相县", "沛县", "彭城", "下邳", "淮阴", "广陵", "郯县",
  "吴县", "曲阿", "丹徒", "阳羡", "乌程", "由拳", "海盐", "余杭",
  "钱唐", "山阴", "句章", "鄞县", "乌伤", "诸暨", "会稽山",
  "浙江", "淮水", "泗水", "邗沟", "江水", "具区泽（震泽）",
]);

function centerOf(coords) {
  let points = coords;
  while (Array.isArray(points?.[0]?.[0])) points = points[0];
  if (!Array.isArray(points?.[0])) return null;
  const total = points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]);
  return [total[0] / points.length, total[1] / points.length];
}

const features = [];
for (const layer of Object.values(source.layers ?? {})) {
  if (!layer?.type || !layer.coord || !["Point", "LineString", "Polygon"].includes(layer.type)) continue;
  if (!layer.name?.trim()) continue;
  const center = layer.type === "Point" ? layer.coord : centerOf(layer.coord);
  const inEastChina = center && center[0] >= 116 && center[0] <= 122.5 && center[1] >= 28.5 && center[1] <= 36.5;
  if (!targetNames.has(layer.name) && !inEastChina) continue;
  features.push({
    type: "Feature",
    properties: {
      name: layer.name ?? "",
      kind: layer.type,
      icon: layer.style?.icon ?? null,
    },
    geometry: { type: layer.type, coordinates: layer.coord },
  });
}

const geojson = {
  type: "FeatureCollection",
  name: "秦代郡县（华东局部）",
  attribution: "观沧海地图共享知识，作者 Circuare，CC BY-SA",
  source: "https://ageeye.app.ditushu.com/map/37030459f79ae1e854f6391c8029cdbdffa40/",
  features,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(geojson));
console.log(`Wrote ${features.length} features to ${output}`);
