import fs from "node:fs";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const chapters = readJson("data/chapters.json");
const entitiesConfig = readJson("data/entities.json");
const relationsConfig = readJson("data/relations.json");
const entities = entitiesConfig.entities;
const relations = relationsConfig.relations;
const entityIds = new Set();
const errors = [];
const warnings = [];

for (const entity of entities) {
  if (entityIds.has(entity.id)) errors.push(`重复实体 ID：${entity.id}`);
  entityIds.add(entity.id);
  if (entity.type !== "PERSON" && entity.type !== "PLACE") errors.push(`实体 ${entity.id}:${entity.name} 类型无效：${entity.type}`);
  if (entity.type === "PERSON" && !String(entity.sourceName ?? "").includes("中文维基百科")) {
    warnings.push(`人物 ${entity.id}:${entity.name} 来源不是中文维基百科：${entity.sourceName ?? "未设置"}`);
  }
  if (entity.type === "PLACE" && String(entity.details ?? "").includes("政治人物")) {
    errors.push(`地名 ${entity.id}:${entity.name} 疑似误用人物词条介绍`);
  }
}

for (const chapter of chapters) {
  for (const paragraph of chapter.paragraphs) {
    for (const annotation of paragraph.annotations ?? []) {
      if (!entityIds.has(annotation.entityId)) {
        errors.push(`段落 ${paragraph.id} 标注 ${annotation.id} 引用了不存在的实体 ${annotation.entityId}`);
      }
      if (annotation.startOffset < 0 || annotation.endOffset > paragraph.content.length || annotation.startOffset >= annotation.endOffset) {
        errors.push(`段落 ${paragraph.id} 标注 ${annotation.id} 偏移无效`);
      }
    }
  }
}

for (const relation of relations) {
  if (!entityIds.has(relation.sourceId)) errors.push(`关系 ${relation.id} 来源实体不存在：${relation.sourceId}`);
  if (!entityIds.has(relation.targetId)) errors.push(`关系 ${relation.id} 目标实体不存在：${relation.targetId}`);
}

if (warnings.length) {
  console.warn(warnings.map((item) => `WARN ${item}`).join("\n"));
}
if (errors.length) {
  console.error(errors.map((item) => `ERROR ${item}`).join("\n"));
  process.exit(1);
}

const readerData = { chapters, entities, relations };
fs.writeFileSync("data/reader-data.json", `${JSON.stringify(readerData)}\n`);
console.log(`已生成 data/reader-data.json：${chapters.length} 篇、${entities.length} 个实体、${relations.length} 条关系`);
