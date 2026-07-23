import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { Entity, ReaderData } from "./types";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "shiji.db"));

db.exec(`PRAGMA busy_timeout = 10000;`);
db.exec(`
  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY, category TEXT NOT NULL, ordinal INTEGER NOT NULL,
    title TEXT NOT NULL, subtitle TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS paragraphs (
    id INTEGER PRIMARY KEY, chapter_id INTEGER NOT NULL, position INTEGER NOT NULL,
    content TEXT NOT NULL, FOREIGN KEY(chapter_id) REFERENCES chapters(id)
  );
  CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL,
    aliases TEXT NOT NULL DEFAULT '[]', summary TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '', modern_name TEXT,
    latitude REAL, longitude REAL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY, paragraph_id INTEGER NOT NULL, entity_id INTEGER NOT NULL,
    start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS relations (
    id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, target_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL, description TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entity_id INTEGER NOT NULL,
    previous_summary TEXT NOT NULL, previous_details TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const seed = db.prepare("SELECT COUNT(*) AS count FROM chapters").get() as { count: number };
if (seed.count === 0) {
  db.exec(`
    INSERT INTO chapters VALUES
      (1, '本纪', 7, '项羽本纪', '力能扛鼎，志在天下'),
      (2, '本纪', 8, '高祖本纪', '布衣提三尺剑取天下'),
      (3, '世家', 31, '吴太伯世家', '让国之德，孔子称焉'),
      (4, '列传', 55, '留侯世家', '运筹帷幄，决胜千里');
    INSERT INTO paragraphs VALUES
      (1, 1, 1, '项籍者，下相人也，字羽。初起时，年二十四。其季父项梁，梁父即楚将项燕，为秦将王翦所戮者也。项氏世世为楚将，封于项，故姓项氏。'),
      (2, 1, 2, '项籍少时，学书不成，去学剑，又不成。项梁怒之。籍曰：“书足以记名姓而已。剑一人敌，不足学，学万人敌。”于是项梁乃教籍兵法，籍大喜，略知其意，又不肯竟学。'),
      (3, 1, 3, '秦始皇帝游会稽，渡浙江，梁与籍俱观。籍曰：“彼可取而代也。”梁掩其口，曰：“毋妄言，族矣！”梁以此奇籍。籍长八尺余，力能扛鼎，才气过人，虽吴中子弟皆已惮籍矣。');
    INSERT INTO entities VALUES
      (1, 'PERSON', '项羽', '["项籍","籍","西楚霸王"]', '秦末军事家，名籍，字羽。', '楚国名将项燕之孙。秦末起兵反秦，巨鹿之战后成为诸侯上将军，秦亡后自立为西楚霸王。', NULL, NULL, NULL, CURRENT_TIMESTAMP),
      (2, 'PLACE', '下相', '["下相县"]', '秦代县名，项羽故里。', '秦置下相县，治所在今江苏省宿迁市宿城区一带。具体古城位置仍有考证空间。', '江苏省宿迁市', 33.9631, 118.2752, CURRENT_TIMESTAMP),
      (3, 'PERSON', '项梁', '[]', '秦末起义领袖，项羽叔父。', '楚国名将项燕之子（一说孙），与项羽在会稽起兵，后战死于定陶。', NULL, NULL, NULL, CURRENT_TIMESTAMP),
      (4, 'PERSON', '项燕', '[]', '战国末期楚国将领。', '楚国大将，曾败秦将李信，后与王翦所率秦军交战。', NULL, NULL, NULL, CURRENT_TIMESTAMP),
      (5, 'PERSON', '王翦', '[]', '战国时期秦国名将。', '秦国频阳东乡人，秦统一六国的重要将领。', NULL, NULL, NULL, CURRENT_TIMESTAMP),
      (6, 'PLACE', '会稽', '["会稽郡"]', '秦汉郡名。', '秦置会稽郡，辖境曾有变化。秦时郡治一般认为在吴县，今江苏苏州。', '江苏省苏州市', 31.299, 120.5853, CURRENT_TIMESTAMP),
      (7, 'PLACE', '浙江', '["渐江","钱塘江"]', '古水名，今钱塘江。', '《史记》此处“浙江”指今钱塘江，因江流曲折而得名。', '钱塘江', 30.2095, 120.212, CURRENT_TIMESTAMP),
      (8, 'PLACE', '吴中', '[]', '泛指吴地中部。', '秦汉时期多指会稽郡吴县及周边地区，核心区域约为今苏州一带。', '江苏省苏州市', 31.299, 120.5853, CURRENT_TIMESTAMP);
    INSERT INTO annotations VALUES
      (1,1,1,0,2),(2,1,2,4,6),(3,1,3,24,26),(4,1,4,32,34),(5,1,5,38,40),
      (6,2,1,0,2),(7,2,3,18,20),(8,2,3,53,55),
      (9,3,6,5,7),(10,3,7,9,11),(11,3,1,14,15),(12,3,3,12,13),(13,3,8,69,71);
    INSERT INTO relations VALUES
      (1,1,3,'叔侄','项梁为项羽季父'),
      (2,1,4,'祖孙','项燕为项羽祖父'),
      (3,4,5,'敌对','王翦率秦军攻楚，项燕兵败');
  `);
}

const schemaVersion = db.prepare("PRAGMA user_version").get() as { user_version: number };
if (schemaVersion.user_version < 1) {
  db.exec(`
    UPDATE annotations SET start_offset=24,end_offset=26 WHERE id=3;
    UPDATE annotations SET start_offset=32,end_offset=34 WHERE id=4;
    UPDATE annotations SET start_offset=38,end_offset=40 WHERE id=5;
    UPDATE annotations SET start_offset=18,end_offset=20 WHERE id=7;
    UPDATE annotations SET start_offset=53,end_offset=55 WHERE id=8;
    UPDATE annotations SET start_offset=14,end_offset=15 WHERE id=11;
    UPDATE annotations SET start_offset=12,end_offset=13 WHERE id=12;
    UPDATE annotations SET start_offset=69,end_offset=71 WHERE id=13;
    PRAGMA user_version = 1;
  `);
}

if (schemaVersion.user_version < 2) {
  const seedPath = path.join(process.cwd(), "data", "seed", "twelve-benji.json");
  const twelveBenji = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    chapters: Array<{ ordinal: number; category: string; title: string; subtitle: string; paragraphs: string[] }>;
  };
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DELETE FROM annotations; DELETE FROM paragraphs; DELETE FROM chapters;");
    const insertChapter = db.prepare("INSERT INTO chapters (id, category, ordinal, title, subtitle) VALUES (?, ?, ?, ?, ?)");
    const insertParagraph = db.prepare("INSERT INTO paragraphs (id, chapter_id, position, content) VALUES (?, ?, ?, ?)");
    let paragraphId = 1;
    for (const chapter of twelveBenji.chapters) {
      insertChapter.run(chapter.ordinal, chapter.category, chapter.ordinal, chapter.title, chapter.subtitle);
      chapter.paragraphs.forEach((content, position) => insertParagraph.run(paragraphId++, chapter.ordinal, position + 1, content));
    }

    const traditionalAliases: Record<number, string[]> = {
      1: ["項羽", "項籍"], 3: ["項梁"], 4: ["項燕"], 5: ["王翦"],
      6: ["會稽", "會稽郡"], 7: ["浙江", "錢塘江"], 8: ["吳中"],
    };
    const entityRows = db.prepare("SELECT id, name, aliases FROM entities").all() as Array<{ id: number; name: string; aliases: string }>;
    const candidates: Array<{ entityId: number; text: string }> = [];
    const updateAliases = db.prepare("UPDATE entities SET aliases = ? WHERE id = ?");
    for (const entity of entityRows) {
      const aliases = Array.from(new Set([entity.name, ...JSON.parse(entity.aliases), ...(traditionalAliases[entity.id] ?? [])]));
      updateAliases.run(JSON.stringify(aliases.filter((alias) => alias !== entity.name)), entity.id);
      aliases.filter((alias) => alias.length >= 2).forEach((text) => candidates.push({ entityId: entity.id, text }));
    }
    candidates.sort((a, b) => b.text.length - a.text.length);
    const paragraphs = db.prepare("SELECT id, content FROM paragraphs").all() as Array<{ id: number; content: string }>;
    const insertAnnotation = db.prepare("INSERT INTO annotations (paragraph_id, entity_id, start_offset, end_offset) VALUES (?, ?, ?, ?)");
    for (const paragraph of paragraphs) {
      const occupied: Array<[number, number]> = [];
      for (const candidate of candidates) {
        let start = paragraph.content.indexOf(candidate.text);
        while (start >= 0) {
          const end = start + candidate.text.length;
          if (!occupied.some(([from, to]) => start < to && end > from)) {
            insertAnnotation.run(paragraph.id, candidate.entityId, start, end);
            occupied.push([start, end]);
          }
          start = paragraph.content.indexOf(candidate.text, start + candidate.text.length);
        }
      }
    }
    db.exec("PRAGMA user_version = 2; COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

if (schemaVersion.user_version < 3) {
  const seedPath = path.join(process.cwd(), "data", "seed", "auto-entities.json");
  const autoEntitySeed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    entities: Array<{
      type: "PERSON" | "PLACE";
      name: string;
      aliases: string[];
      summary: string;
      details: string;
      modernName?: string;
      latitude?: number;
      longitude?: number;
    }>;
  };

  db.exec("BEGIN IMMEDIATE");
  try {
    const insertEntity = db.prepare(`
      INSERT INTO entities (type, name, aliases, summary, details, modern_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateAliases = db.prepare("UPDATE entities SET aliases = ? WHERE id = ?");

    // Match on the canonical name or any alias so an existing, manually edited
    // entry is enriched instead of being replaced by the generated seed entry.
    const existing = db.prepare("SELECT id, type, name, aliases FROM entities").all() as Array<{
      id: number; type: string; name: string; aliases: string;
    }>;
    for (const incoming of autoEntitySeed.entities) {
      const incomingNames = new Set([incoming.name, ...incoming.aliases]);
      const match = existing.find((entity) => {
        if (entity.type !== incoming.type) return false;
        return [entity.name, ...(JSON.parse(entity.aliases) as string[])].some((name) => incomingNames.has(name));
      });
      if (match) {
        const aliases = Array.from(new Set([
          ...(JSON.parse(match.aliases) as string[]),
          incoming.name,
          ...incoming.aliases,
        ])).filter((name) => name !== match.name);
        updateAliases.run(JSON.stringify(aliases), match.id);
        match.aliases = JSON.stringify(aliases);
      } else {
        const result = insertEntity.run(
          incoming.type,
          incoming.name,
          JSON.stringify(incoming.aliases),
          incoming.summary,
          incoming.details,
          incoming.modernName ?? null,
          incoming.latitude ?? null,
          incoming.longitude ?? null,
        );
        existing.push({
          id: Number(result.lastInsertRowid),
          type: incoming.type,
          name: incoming.name,
          aliases: JSON.stringify(incoming.aliases),
        });
      }
    }

    db.exec("DELETE FROM annotations");
    const candidates = existing.flatMap((entity) =>
      Array.from(new Set([entity.name, ...(JSON.parse(entity.aliases) as string[])]))
        .filter((text) => text.length >= 2)
        .map((text) => ({ entityId: entity.id, text })),
    ).sort((a, b) => b.text.length - a.text.length || a.entityId - b.entityId);
    const paragraphs = db.prepare("SELECT id, content FROM paragraphs").all() as Array<{ id: number; content: string }>;
    const insertAnnotation = db.prepare(`
      INSERT INTO annotations (paragraph_id, entity_id, start_offset, end_offset)
      VALUES (?, ?, ?, ?)
    `);
    for (const paragraph of paragraphs) {
      const occupied: Array<[number, number]> = [];
      for (const candidate of candidates) {
        let start = paragraph.content.indexOf(candidate.text);
        while (start >= 0) {
          const end = start + candidate.text.length;
          if (!occupied.some(([from, to]) => start < to && end > from)) {
            insertAnnotation.run(paragraph.id, candidate.entityId, start, end);
            occupied.push([start, end]);
          }
          start = paragraph.content.indexOf(candidate.text, start + candidate.text.length);
        }
      }
    }

    db.exec("PRAGMA user_version = 3; COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

if (schemaVersion.user_version < 4) {
  const seedPath = path.join(process.cwd(), "data", "seed", "auto-relations.json");
  const relationSeed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    relations: Array<{ source: string; target: string; type: string; description: string }>;
  };

  db.exec("BEGIN IMMEDIATE");
  try {
    const people = db.prepare("SELECT id, name, aliases FROM entities WHERE type = 'PERSON'").all() as Array<{
      id: number; name: string; aliases: string;
    }>;
    const personByName = new Map<string, number>();
    for (const person of people) {
      for (const name of [person.name, ...(JSON.parse(person.aliases) as string[])]) {
        if (!personByName.has(name)) personByName.set(name, person.id);
      }
    }

    const existingRelations = db.prepare("SELECT source_id, target_id, relation_type FROM relations").all() as Array<{
      source_id: number; target_id: number; relation_type: string;
    }>;
    const relationKey = (sourceId: number, targetId: number, type: string) =>
      `${Math.min(sourceId, targetId)}:${Math.max(sourceId, targetId)}:${type}`;
    const known = new Set(existingRelations.map((relation) =>
      relationKey(relation.source_id, relation.target_id, relation.relation_type),
    ));
    const insertRelation = db.prepare(`
      INSERT INTO relations (source_id, target_id, relation_type, description)
      VALUES (?, ?, ?, ?)
    `);
    for (const relation of relationSeed.relations) {
      const sourceId = personByName.get(relation.source);
      const targetId = personByName.get(relation.target);
      if (!sourceId || !targetId) continue;
      const key = relationKey(sourceId, targetId, relation.type);
      if (known.has(key)) continue;
      insertRelation.run(sourceId, targetId, relation.type, relation.description);
      known.add(key);
    }

    db.exec("PRAGMA user_version = 4; COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

if (schemaVersion.user_version < 5) {
  const columns = db.prepare("PRAGMA table_info(entities)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));
  if (!columnNames.has("source_name")) db.exec("ALTER TABLE entities ADD COLUMN source_name TEXT");
  if (!columnNames.has("source_url")) db.exec("ALTER TABLE entities ADD COLUMN source_url TEXT");
  if (!columnNames.has("source_updated_at")) db.exec("ALTER TABLE entities ADD COLUMN source_updated_at TEXT");

  const descriptionsPath = path.join(process.cwd(), "data", "seed", "entity-descriptions.json");
  if (fs.existsSync(descriptionsPath)) {
    const descriptionSeed = JSON.parse(fs.readFileSync(descriptionsPath, "utf8")) as {
      entities: Array<{
        name: string; summary: string; details: string;
        sourceName: string; sourceUrl: string; sourceUpdatedAt: string;
      }>;
    };
    const findEntity = db.prepare(`
      SELECT id, summary, details FROM entities
      WHERE name = ? OR EXISTS (SELECT 1 FROM json_each(aliases) WHERE value = ?)
      LIMIT 1
    `);
    const applyDescription = db.prepare(`
      UPDATE entities
      SET summary = ?, details = ?, source_name = ?, source_url = ?, source_updated_at = ?
      WHERE id = ?
    `);
    for (const incoming of descriptionSeed.entities) {
      const entity = findEntity.get(incoming.name, incoming.name) as {
        id: number; summary: string; details: string;
      } | undefined;
      if (!entity) continue;
      const isGenerated = entity.details.startsWith("本条目由") || entity.summary.includes("十二本纪相关");
      if (!isGenerated) continue;
      applyDescription.run(
        incoming.summary, incoming.details, incoming.sourceName,
        incoming.sourceUrl, incoming.sourceUpdatedAt, entity.id,
      );
    }
  }
  db.exec("PRAGMA user_version = 5;");
}

if (schemaVersion.user_version < 6) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const findPerson = db.prepare("SELECT id, name, aliases FROM entities WHERE type = 'PERSON' AND name = ?");
    const updateAliases = db.prepare("UPDATE entities SET aliases = ? WHERE id = ?");
    const moveAnnotations = db.prepare("UPDATE annotations SET entity_id = ? WHERE entity_id = ?");
    const moveRelationSources = db.prepare("UPDATE relations SET source_id = ? WHERE source_id = ?");
    const moveRelationTargets = db.prepare("UPDATE relations SET target_id = ? WHERE target_id = ?");
    const deleteEntity = db.prepare("DELETE FROM entities WHERE id = ?");
    const duplicatePeople = [
      { canonical: "顓頊", duplicate: "高陽" },
      { canonical: "帝嚳", duplicate: "高辛" },
      { canonical: "帝堯", duplicate: "放勳" },
    ];
    for (const pair of duplicatePeople) {
      const canonical = findPerson.get(pair.canonical) as { id: number; name: string; aliases: string } | undefined;
      const duplicate = findPerson.get(pair.duplicate) as { id: number; name: string; aliases: string } | undefined;
      if (!canonical || !duplicate) continue;
      const aliases = Array.from(new Set([
        ...(JSON.parse(canonical.aliases) as string[]),
        duplicate.name,
        ...(JSON.parse(duplicate.aliases) as string[]),
      ])).filter((name) => name !== canonical.name);
      updateAliases.run(JSON.stringify(aliases), canonical.id);
      moveAnnotations.run(canonical.id, duplicate.id);
      moveRelationSources.run(canonical.id, duplicate.id);
      moveRelationTargets.run(canonical.id, duplicate.id);
      deleteEntity.run(duplicate.id);
    }
    db.exec(`
      DELETE FROM relations WHERE source_id = target_id;
      DELETE FROM relations WHERE id NOT IN (
        SELECT MIN(id) FROM relations
        GROUP BY
          CASE WHEN source_id < target_id THEN source_id ELSE target_id END,
          CASE WHEN source_id < target_id THEN target_id ELSE source_id END,
          relation_type
      );
      PRAGMA user_version = 6;
      COMMIT;
    `);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getReaderData(): ReaderData {
  const chapters = db.prepare("SELECT * FROM chapters ORDER BY ordinal").all() as any[];
  const paragraphs = db.prepare("SELECT * FROM paragraphs ORDER BY chapter_id, position").all() as any[];
  const annotations = db.prepare("SELECT id, paragraph_id paragraphId, entity_id entityId, start_offset startOffset, end_offset endOffset FROM annotations").all() as any[];
  return {
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      category: chapter.category,
      ordinal: chapter.ordinal,
      title: chapter.title,
      subtitle: chapter.subtitle,
      paragraphs: paragraphs.filter((p) => p.chapter_id === chapter.id).map((p) => ({
        id: p.id,
        content: p.content,
        annotations: annotations.filter((a) => a.paragraphId === p.id).map((a) => ({
          id: a.id,
          paragraphId: a.paragraphId,
          entityId: a.entityId,
          startOffset: a.startOffset,
          endOffset: a.endOffset,
        })),
      })),
    })),
    entities: (db.prepare("SELECT id,type,name,aliases,summary,details,modern_name modernName,latitude,longitude,source_name sourceName,source_url sourceUrl,source_updated_at sourceUpdatedAt FROM entities ORDER BY id").all() as any[])
      .map((entity) => ({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        aliases: JSON.parse(entity.aliases),
        summary: entity.summary,
        details: entity.details,
        modernName: entity.modernName ?? undefined,
        latitude: entity.latitude ?? undefined,
        longitude: entity.longitude ?? undefined,
        sourceName: entity.sourceName ?? undefined,
        sourceUrl: entity.sourceUrl ?? undefined,
        sourceUpdatedAt: entity.sourceUpdatedAt ?? undefined,
      })),
    relations: (db.prepare("SELECT id,source_id sourceId,target_id targetId,relation_type relationType,description FROM relations").all() as any[])
      .map((relation) => ({
        id: relation.id,
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        relationType: relation.relationType,
        description: relation.description,
      })),
  };
}

export function updateEntity(id: number, input: Pick<Entity, "summary" | "details">): Entity | null {
  const current = db.prepare("SELECT * FROM entities WHERE id = ?").get(id) as any;
  if (!current) return null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO revisions (entity_id, previous_summary, previous_details) VALUES (?, ?, ?)")
      .run(id, current.summary, current.details);
    db.prepare("UPDATE entities SET summary = ?, details = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(input.summary, input.details, id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const updated = db.prepare("SELECT id,type,name,aliases,summary,details,modern_name modernName,latitude,longitude,source_name sourceName,source_url sourceUrl,source_updated_at sourceUpdatedAt FROM entities WHERE id = ?").get(id) as any;
  return {
    id: updated.id,
    type: updated.type,
    name: updated.name,
    aliases: JSON.parse(updated.aliases),
    summary: updated.summary,
    details: updated.details,
    modernName: updated.modernName ?? undefined,
    latitude: updated.latitude ?? undefined,
    longitude: updated.longitude ?? undefined,
    sourceName: updated.sourceName ?? undefined,
    sourceUrl: updated.sourceUrl ?? undefined,
    sourceUpdatedAt: updated.sourceUpdatedAt ?? undefined,
  };
}
