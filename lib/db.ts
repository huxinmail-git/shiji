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
    entities: (db.prepare("SELECT id,type,name,aliases,summary,details,modern_name modernName,latitude,longitude FROM entities ORDER BY id").all() as any[])
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
  const updated = db.prepare("SELECT id,type,name,aliases,summary,details,modern_name modernName,latitude,longitude FROM entities WHERE id = ?").get(id) as any;
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
  };
}
