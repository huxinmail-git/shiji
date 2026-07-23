import { DatabaseSync } from "node:sqlite";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const root = process.cwd();
const db = new DatabaseSync(path.join(root, "data", "shiji.db"));
const outputPath = path.join(root, "data", "seed", "entity-descriptions.json");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const nameArg = process.argv.find((arg) => arg.startsWith("--name="));
const selectedName = nameArg ? nameArg.slice("--name=".length) : null;
const syncOnly = process.argv.includes("--sync-only");
const onlyGenerated = !process.argv.includes("--overwrite");
const apiRoot = "https://api.wikimedia.org/core/v1/wikipedia/zh/page";
const revisionApiRoot = "https://api.wikimedia.org/core/v1/wikipedia/zh/revision";
const userAgent = "ShijiReader/0.1 (local educational project)";
const execFileAsync = promisify(execFile);
const titleOverrides = {
  "帝嚳": ["嚳", "喾"],
  "帝堯": ["堯", "尧"],
  "帝舜": ["舜"],
  "后稷": ["棄", "弃"],
  "太康": ["太康 (夏朝)", "太康 (夏朝君主)"],
  "成湯": ["商湯", "商汤", "湯", "汤"],
  "高陽": ["顓頊", "颛顼"],
  "高辛": ["嚳", "喾"],
  "放勳": ["堯", "尧"],
};

function decodeHtml(text) {
  return text
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
}

function plainText(html) {
  function stripTagsRespectingQuotes(value) {
    let result = "";
    let inTag = false;
    let quote = null;
    for (const character of value) {
      if (!inTag) {
        if (character === "<") inTag = true;
        else result += character;
        continue;
      }
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === "'" || character === "\"") {
        quote = character;
      } else if (character === ">") {
        inTag = false;
      }
    }
    return result;
  }

  const withoutElements = html
    .replace(/<(style|script|sup)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n");
  return decodeHtml(stripTagsRespectingQuotes(withoutElements))
    .replace(/\[[0-9]+\]/g, "")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

function extractIntroduction(html) {
  const lead = html.split(/<section\b[^>]*data-mw-section-id="1"/i)[0];
  const paragraphs = [];
  for (const match of lead.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = plainText(match[1]);
    if (text.length < 25 || text === "系列條目") continue;
    paragraphs.push(text);
    if (paragraphs.join("\n\n").length >= 900 || paragraphs.length === 3) break;
  }
  return paragraphs.join("\n\n").slice(0, 1200);
}

async function request(url) {
  // macOS 上的代理设置常常能被 curl 自动读取，但 Node fetch 不会读取，
  // 因此使用参数化的 execFile 调用 curl，避免 shell 拼接和代理不一致。
  for (let attempt = 0; attempt < 6; attempt++) {
    let stdout;
    try {
      ({ stdout } = await execFileAsync("curl", [
        "-L", "-sS", "--max-time", "40",
        "-A", userAgent, "-w", "\n%{http_code}", url,
      ], { maxBuffer: 8 * 1024 * 1024 }));
    } catch (error) {
      if (attempt === 5) throw error;
      const waitSeconds = 6 * (attempt + 1);
      console.log(`Wikimedia 网络请求失败，${waitSeconds} 秒后重试...`);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }
    const separator = stdout.lastIndexOf("\n");
    const body = separator >= 0 ? stdout.slice(0, separator) : stdout;
    const status = Number(separator >= 0 ? stdout.slice(separator + 1) : 0);
    const rateLimited = status === 429 || /making too many requests/i.test(body);
    if (rateLimited && attempt < 5) {
      const waitSeconds = 8 * (attempt + 1);
      console.log(`Wikimedia 请求受限，${waitSeconds} 秒后重试...`);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { ok: !rateLimited && status >= 200 && status < 300, status: rateLimited ? 429 : status, body };
  }
  return { ok: false, status: 429, body: "" };
}

async function requestJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await request(url);
    if (!response.ok) return { data: null, status: `HTTP ${response.status}` };
    try {
      return { data: JSON.parse(response.body), status: response.status };
    } catch {
      if (attempt === 3) return { data: null, status: "响应不是 JSON" };
      const waitSeconds = 8 * (attempt + 1);
      console.log(`Wikimedia 返回异常内容，${waitSeconds} 秒后重试...`);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
    }
  }
  return { data: null, status: "响应不是 JSON" };
}

async function resolvePage(title) {
  let currentTitle = title;
  for (let depth = 0; depth < 4; depth++) {
    const pageResponse = await requestJson(`${apiRoot}/${encodeURIComponent(currentTitle)}`);
    if (!pageResponse.data) return { page: null, status: pageResponse.status };
    const page = pageResponse.data;
    const redirect = String(page.source ?? "").trim().match(/^#(?:REDIRECT|重定向)\s*\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/i);
    if (!redirect) return { page, status: pageResponse.status };
    currentTitle = redirect[1].trim();
  }
  return { page: null, status: "重定向层级过多" };
}

async function fetchEntry(titles) {
  const failures = [];
  for (const title of titles) {
    try {
      const resolved = await resolvePage(title);
      if (!resolved.page) {
        failures.push(`${title}: 页面 ${resolved.status}`);
        continue;
      }
      const page = resolved.page;
      const revisionId = page.latest?.id;
      if (!revisionId) {
        failures.push(`${title}: 页面缺少修订号`);
        continue;
      }
      const htmlResponse = await request(`${revisionApiRoot}/${revisionId}/html`);
      if (!htmlResponse.ok) {
        failures.push(`${title}: 正文 HTTP ${htmlResponse.status}`);
        continue;
      }
      const html = htmlResponse.body;
      const pageTitle = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
      const isWikipediaArticle = html.includes('property="mw:pageId"')
        && html.includes('rel="dc:isVersionOf"')
        && pageTitle !== "Wikimedia APIs - MediaWiki";
      if (!isWikipediaArticle) {
        failures.push(`${title}: 接口返回的不是维基百科词条`);
        continue;
      }
      if (html.includes("mw:PageProp/disambiguation")) {
        failures.push(`${title}: 消歧义页`);
        continue;
      }
      const details = extractIntroduction(html);
      if (!details) {
        failures.push(`${title}: 未提取到正文段落`);
        continue;
      }
      const summary = details.match(/^.*?[。！？]/)?.[0] ?? details.slice(0, 80);
      return { entry: {
        summary: /[。！？]$/.test(summary) ? summary : `${summary}。`,
        details,
        sourceName: `中文维基百科：${pageTitle}`,
        sourceUrl: `https://zh.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
        sourceUpdatedAt: new Date().toISOString(),
      }, failures };
    } catch (error) {
      console.warn(`  ${title} 请求失败：${error.message}`);
      failures.push(`${title}: 请求失败`);
    }
  }
  return { entry: null, failures };
}

const columns = db.prepare("PRAGMA table_info(entities)").all().map((column) => column.name);
if (!columns.includes("source_name")) db.exec("ALTER TABLE entities ADD COLUMN source_name TEXT");
if (!columns.includes("source_url")) db.exec("ALTER TABLE entities ADD COLUMN source_url TEXT");
if (!columns.includes("source_updated_at")) db.exec("ALTER TABLE entities ADD COLUMN source_updated_at TEXT");

const allEntities = db.prepare(`
  SELECT id, type, name, aliases, summary, details,
    source_name sourceName, source_url sourceUrl, source_updated_at sourceUpdatedAt
  FROM entities ORDER BY id
`).all();
let entities = [...allEntities];
if (selectedName) {
  entities = entities.filter((entity) =>
    [entity.name, ...JSON.parse(entity.aliases)].includes(selectedName),
  );
} else if (onlyGenerated) {
  entities = entities.filter((entity) => entity.details.startsWith("本条目由") || entity.summary.includes("十二本纪相关"));
}
entities = entities.slice(0, limit);

const previous = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : { entities: [] };
const generated = new Map(previous.entities.map((entity) => [entity.name, entity]));
for (const entity of allEntities) {
  if (!entity.sourceUrl) continue;
  generated.set(entity.name, {
    type: entity.type,
    name: entity.name,
    summary: entity.summary,
    details: entity.details,
    sourceName: entity.sourceName,
    sourceUrl: entity.sourceUrl,
    sourceUpdatedAt: entity.sourceUpdatedAt,
  });
}
if (syncOnly) entities = [];
const update = db.prepare(`
  UPDATE entities SET summary = ?, details = ?, source_name = ?, source_url = ?, source_updated_at = ?
  WHERE id = ?
`);

let cursor = 0;
let success = 0;
function saveSeed() {
  const result = {
    source: "Wikimedia 官方 API（中文维基百科，CC BY-SA）",
    generatedAt: new Date().toISOString(),
    entities: Array.from(generated.values()).sort((a, b) => a.name.localeCompare(b.name, "zh")),
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

async function worker() {
  while (cursor < entities.length) {
    const entity = entities[cursor++];
    const titles = [entity.name, ...JSON.parse(entity.aliases), ...(titleOverrides[entity.name] ?? [])]
      .filter((title, index, values) => title.length >= 1 && values.indexOf(title) === index);
    const { entry, failures } = await fetchEntry(titles);
    if (!entry) {
      console.log(`跳过 ${entity.type === "PERSON" ? "人物" : "地名"}：${entity.name}（${failures.join("；") || "无可用标题"}）`);
      continue;
    }
    update.run(entry.summary, entry.details, entry.sourceName, entry.sourceUrl, entry.sourceUpdatedAt, entity.id);
    generated.set(entity.name, { type: entity.type, name: entity.name, ...entry });
    saveSeed();
    success++;
    console.log(`已生成 ${entity.name} → ${entry.sourceName}`);
  }
}

// Wikimedia 公共接口有频率限制，串行请求更稳定，也避免给服务端造成压力。
await worker();
const result = saveSeed();
console.log(`完成：本次生成 ${success}/${entities.length} 条，种子文件共 ${result.entities.length} 条。`);
