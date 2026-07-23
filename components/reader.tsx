"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Edit3, Map, Menu, Network, Search, X } from "lucide-react";
import type { Chapter, Entity, Paragraph, ReaderData } from "@/lib/types";
import PlaceMap from "@/components/place-map";

function chineseNumber(value: number) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value < 10) return digits[value];
  if (value === 10) return "十";
  if (value < 20) return `十${digits[value - 10]}`;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${digits[tens]}十${ones ? digits[ones] : ""}`;
}

function MarkedParagraph({ paragraph, entities, onSelect }: { paragraph: Paragraph; entities: Entity[]; onSelect: (entity: Entity) => void }) {
  const marks = [...paragraph.annotations].sort((a, b) => a.startOffset - b.startOffset);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.startOffset < cursor || mark.endOffset > paragraph.content.length) continue;
    parts.push(paragraph.content.slice(cursor, mark.startOffset));
    const entity = entities.find((item) => item.id === mark.entityId);
    const label = paragraph.content.slice(mark.startOffset, mark.endOffset);
    parts.push(entity ? (
      <button key={mark.id} className={`entity-mark ${entity.type.toLowerCase()}`} onClick={() => onSelect(entity)} title={`查看${entity.type === "PERSON" ? "人物" : "地名"}：${entity.name}`}>{label}</button>
    ) : label);
    cursor = mark.endOffset;
  }
  parts.push(paragraph.content.slice(cursor));
  return <p className="classic-text">{parts}</p>;
}

function EntityPanel({ entity, data, onClose, onSaved }: { entity: Entity; data: ReaderData; onClose: () => void; onSaved: (entity: Entity) => void }) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(entity.summary);
  const [details, setDetails] = useState(entity.details);
  const [saving, setSaving] = useState(false);
  const related = data.relations.filter((relation) => relation.sourceId === entity.id || relation.targetId === entity.id);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/entities/${entity.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary, details }) });
    if (response.ok) { onSaved(await response.json()); setEditing(false); }
    setSaving(false);
  }

  return <aside className="detail-panel">
    <div className="panel-topline"><span>{entity.type === "PERSON" ? "人物志" : "地理志"}</span><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18}/></button></div>
    <div className={`entity-seal ${entity.type.toLowerCase()}`}>{entity.name.slice(0, 1)}</div>
    <h2>{entity.name}</h2>
    {entity.aliases.length > 0 && <div className="aliases">又称　{entity.aliases.join(" · ")}</div>}
    {editing ? <div className="edit-form">
      <label>简要说明<textarea rows={3} value={summary} onChange={(event) => setSummary(event.target.value)}/></label>
      <label>详细内容<textarea rows={8} value={details} onChange={(event) => setDetails(event.target.value)}/></label>
      <div className="edit-actions"><button className="secondary" onClick={() => setEditing(false)}>取消</button><button className="primary" onClick={save} disabled={saving}><Check size={15}/>{saving ? "保存中" : "保存"}</button></div>
    </div> : <>
      <p className="entity-summary">{entity.summary}</p><p className="entity-details">{entity.details}</p>
      {entity.sourceUrl && <p className="entity-source">参考资料：<a href={entity.sourceUrl} target="_blank" rel="noreferrer">{entity.sourceName ?? "维基百科"}</a>{entity.sourceUpdatedAt ? ` · ${entity.sourceUpdatedAt.slice(0, 10)}` : ""}</p>}
      <button className="edit-button" onClick={() => setEditing(true)}><Edit3 size={15}/>编辑说明</button>
    </>}
    {entity.type === "PERSON" && <section className="panel-section"><div className="section-title"><Network size={16}/>人物关联</div>{related.length ? related.map((relation) => {
      const otherId = relation.sourceId === entity.id ? relation.targetId : relation.sourceId;
      const other = data.entities.find((item) => item.id === otherId);
      return <div className="relation" key={relation.id}><div><strong>{other?.name}</strong><span>{relation.relationType}</span></div><p>{relation.description}</p></div>;
    }) : <p className="muted">暂无已考证关系</p>}</section>}
    {entity.type === "PLACE" && <section className="panel-section"><div className="section-title"><Map size={16}/>现代位置</div><PlaceMap entity={entity}/><p className="map-note">地图显示该地点今天的位置、道路和周边城市，可缩放和拖动查看。</p></section>}
  </aside>;
}

export default function Reader({ initialData }: { initialData: ReaderData }) {
  const [data, setData] = useState(initialData);
  const [chapterId, setChapterId] = useState(initialData.chapters[0].id);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const chapter = data.chapters.find((item) => item.id === chapterId) as Chapter;
  const filtered = useMemo(() => data.chapters.filter((item) => item.title.includes(query)), [data.chapters, query]);
  const currentIndex = data.chapters.findIndex((item) => item.id === chapterId);

  function selectChapter(id: number) { setChapterId(id); setSelected(null); setNavOpen(false); }
  function updateEntity(entity: Entity) { setData((current) => ({ ...current, entities: current.entities.map((item) => item.id === entity.id ? entity : item) })); setSelected(entity); }

  return <main className="app-shell">
    <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setNavOpen(true)} aria-label="打开目录"><Menu/></button><div className="brand"><span className="brand-mark">史</span><div><strong>太史书</strong><small>史记数字阅读</small></div></div><div className="reading-progress"><span>正在阅读</span><strong>{chapter.title}</strong></div><div className="legend"><span><i className="line person-line"/>人物</span><span><i className="line place-line"/>地名</span></div></header>
    <div className="workspace">
      <nav className={`chapter-nav ${navOpen ? "open" : ""}`}>
        <div className="nav-heading"><div><small>卷目</small><h2>史记百三十篇</h2></div><button className="mobile-close icon-button" onClick={() => setNavOpen(false)}><X size={18}/></button></div>
        <div className="search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索篇目"/></div>
        <div className="chapter-list">{filtered.map((item) => <button key={item.id} className={item.id === chapterId ? "active" : ""} onClick={() => selectChapter(item.id)}><span>{String(item.ordinal).padStart(2, "0")}</span><div><strong>{item.title}</strong><small>{item.category}</small></div></button>)}</div>
        <div className="nav-foot"><BookOpen size={16}/><span>十二本纪全文 · 维基文库 CC BY-SA</span></div>
      </nav>
      {navOpen && <button className="backdrop" onClick={() => setNavOpen(false)} aria-label="关闭目录"/>}
      <article className="reading-pane">
        <div className="paper">
          <div className="chapter-kicker">卷{chineseNumber(chapter.ordinal)} · {chapter.category}第{chineseNumber(chapter.ordinal)}</div><h1>{chapter.title}</h1><p className="chapter-subtitle">{chapter.subtitle}</p><div className="ornament"><span/><b>太史公曰</b><span/></div>
          <div className="prose">{chapter.paragraphs.length ? chapter.paragraphs.map((paragraph) => <MarkedParagraph key={paragraph.id} paragraph={paragraph} entities={data.entities} onSelect={setSelected}/>) : <div className="empty-chapter"><BookOpen size={30}/><p>该篇正文尚待导入</p></div>}</div>
          <footer className="chapter-pagination"><button disabled={currentIndex === 0} onClick={() => selectChapter(data.chapters[currentIndex - 1].id)}><ChevronLeft size={18}/>上一篇</button><span>第 {chapter.ordinal} 卷</span><button disabled={currentIndex === data.chapters.length - 1} onClick={() => selectChapter(data.chapters[currentIndex + 1].id)}>下一篇<ChevronRight size={18}/></button></footer>
        </div>
      </article>
      {selected && <EntityPanel key={selected.id} entity={selected} data={data} onClose={() => setSelected(null)} onSaved={updateEntity}/>} 
    </div>
  </main>;
}
