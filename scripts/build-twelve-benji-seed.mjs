import fs from "node:fs";
import path from "node:path";

const inputDir = process.argv[2] ?? "/tmp";
const output = process.argv[3] ?? "data/seed/twelve-benji.json";
const metadata = [
  [1, "五帝本纪", "上古帝王世系"],
  [2, "夏本纪", "禹平洪水，夏家天下"],
  [3, "殷本纪", "成汤伐桀，殷商兴亡"],
  [4, "周本纪", "后稷肇周，武王克商"],
  [5, "秦本纪", "秦之先世，西戎霸业"],
  [6, "秦始皇本纪", "并吞六国，一统天下"],
  [7, "项羽本纪", "力能扛鼎，志在天下"],
  [8, "高祖本纪", "布衣提三尺剑取天下"],
  [9, "吕太后本纪", "临朝称制，政不出房户"],
  [10, "孝文本纪", "德厚侔天地，利泽施四海"],
  [11, "孝景本纪", "削藩平乱，承文启武"],
  [12, "孝武本纪", "封禅改制，拓土开边"],
];

function readExtract(ordinal) {
  const number = String(ordinal).padStart(3, "0");
  const filename = ordinal === 1 ? "shiji-extract.json" : `shiji-${number}.json`;
  const data = JSON.parse(fs.readFileSync(path.join(inputDir, filename), "utf8"));
  const extract = data.query?.pages?.[0]?.extract;
  if (typeof extract !== "string" || extract.trim().length < 500) throw new Error(`卷${number}正文缺失`);
  return extract.trim().split(/\n+/).map((block) => {
    const text = block.trim().replace(/^==+\s*(.*?)\s*==+$/s, "〔$1〕").replace(/\n+/g, "");
    return text;
  }).filter(Boolean);
}

const chapters = metadata.map(([ordinal, title, subtitle]) => ({ ordinal, category: "本纪", title, subtitle, paragraphs: readExtract(ordinal) }));
const seed = {
  source: "https://zh.wikisource.org/wiki/史記",
  sourceName: "维基文库《史记》",
  license: "CC BY-SA 4.0",
  retrievedAt: "2026-07-23",
  chapters,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(seed, null, 2) + "\n");
console.log(`生成 ${chapters.length} 篇、${chapters.reduce((sum, chapter) => sum + chapter.paragraphs.length, 0)} 段正文：${output}`);
