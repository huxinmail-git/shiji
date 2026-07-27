import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const databasePath = path.join(root, "data", "shiji.db");
const outputPath = path.join(root, "data", "reader-data.json");
const db = new DatabaseSync(databasePath, { readOnly: true });

const chapters = db.prepare("SELECT * FROM chapters ORDER BY ordinal").all();
const paragraphs = db.prepare("SELECT * FROM paragraphs ORDER BY chapter_id, position").all();
const annotations = db.prepare(`
  SELECT id, paragraph_id paragraphId, entity_id entityId,
         start_offset startOffset, end_offset endOffset
  FROM annotations
`).all();
const entities = db.prepare(`
  SELECT id,type,name,aliases,summary,details,modern_name modernName,
         latitude,longitude,source_name sourceName,source_url sourceUrl,
         source_updated_at sourceUpdatedAt
  FROM entities ORDER BY id
`).all().map((entity) => ({
  id: entity.id,
  type: entity.type,
  name: entity.name,
  aliases: JSON.parse(entity.aliases),
  summary: entity.summary,
  details: entity.details,
  ...(entity.modernName == null ? {} : { modernName: entity.modernName }),
  ...(entity.latitude == null ? {} : { latitude: entity.latitude }),
  ...(entity.longitude == null ? {} : { longitude: entity.longitude }),
  ...(entity.sourceName == null ? {} : { sourceName: entity.sourceName }),
  ...(entity.sourceUrl == null ? {} : { sourceUrl: entity.sourceUrl }),
  ...(entity.sourceUpdatedAt == null ? {} : { sourceUpdatedAt: entity.sourceUpdatedAt }),
}));
const relations = db.prepare(`
  SELECT id,source_id sourceId,target_id targetId,
         relation_type relationType,description
  FROM relations
`).all();

const readerData = {
  chapters: chapters.map((chapter) => ({
    id: chapter.id,
    category: chapter.category,
    ordinal: chapter.ordinal,
    title: chapter.title,
    subtitle: chapter.subtitle,
    paragraphs: paragraphs
      .filter((paragraph) => paragraph.chapter_id === chapter.id)
      .map((paragraph) => ({
        id: paragraph.id,
        content: paragraph.content,
        annotations: annotations.filter((annotation) => annotation.paragraphId === paragraph.id),
      })),
  })),
  entities,
  relations,
};

fs.writeFileSync(outputPath, JSON.stringify(readerData));
console.log(`已导出 ${chapters.length} 篇、${paragraphs.length} 段、${entities.length} 个实体到 data/reader-data.json`);
