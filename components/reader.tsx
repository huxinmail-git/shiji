"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Map, Menu, Network, Search, X } from "lucide-react";
import type { Chapter, Entity, Paragraph, ReaderData } from "@/lib/types";
import PlaceMap from "@/components/place-map";
import AdSlot from "@/components/ad-slot";
import { trackEvent, trackPageView, VisitCounter } from "@/components/analytics";
import type { AdPlacement, VisitCounterProvider } from "@/lib/site-config";

const READING_PROGRESS_KEY = "shiji.reading-progress.v1";

type ReadingProgress = {
  chapterId: number;
  scrollTop: number;
  updatedAt: string;
};

function readSavedProgress(chapterIds: Set<number>): ReadingProgress | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(READING_PROGRESS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<ReadingProgress>;
    const parsedChapterId = parsed.chapterId;
    if (typeof parsedChapterId !== "number" || !Number.isInteger(parsedChapterId) || !chapterIds.has(parsedChapterId)) return undefined;
    return {
      chapterId: parsedChapterId,
      scrollTop: typeof parsed.scrollTop === "number" && parsed.scrollTop > 0 ? parsed.scrollTop : 0,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return undefined;
  }
}

function saveReadingProgress(chapterId: number, scrollTop: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify({
      chapterId,
      scrollTop: Math.max(0, Math.round(scrollTop)),
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Ignore storage failures.
  }
}

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

function EntityPanel({ entity, data, onClose }: { entity: Entity; data: ReaderData; onClose: () => void }) {
  const related = data.relations.filter((relation) => relation.sourceId === entity.id || relation.targetId === entity.id);

  return <aside className="detail-panel">
    <div className="panel-topline"><span>{entity.type === "PERSON" ? "人物志" : "地理志"}</span><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18}/></button></div>
    <div className={`entity-seal ${entity.type.toLowerCase()}`}>{entity.name.slice(0, 1)}</div>
    <h2>{entity.name}</h2>
    {entity.aliases.length > 0 && <div className="aliases">又称　{entity.aliases.join(" · ")}</div>}
    <p className="entity-summary">{entity.summary}</p><p className="entity-details">{entity.details}</p>
    {entity.sourceUrl && <p className="entity-source">参考资料：<a href={entity.sourceUrl} target="_blank" rel="noreferrer">{entity.sourceName ?? "资料来源"}</a>{entity.sourceUpdatedAt ? ` · ${entity.sourceUpdatedAt.slice(0, 10)}` : ""}</p>}
    {entity.type === "PERSON" && <section className="panel-section"><div className="section-title"><Network size={16}/>人物关联</div>{related.length ? related.map((relation) => {
      const otherId = relation.sourceId === entity.id ? relation.targetId : relation.sourceId;
      const other = data.entities.find((item) => item.id === otherId);
      return <div className="relation" key={relation.id}><div><strong>{other?.name}</strong><span>{relation.relationType}</span></div><p>{relation.description}</p></div>;
    }) : <p className="muted">暂无已考证关系</p>}</section>}
    {entity.type === "PLACE" && <section className="panel-section"><div className="section-title"><Map size={16}/>现代位置</div><PlaceMap entity={entity}/><p className="map-note">地图显示该地点今天的位置、道路和周边城市；底图不可用时会显示本地示意图。</p></section>}
  </aside>;
}

export default function Reader({ initialData, chapterEndAd, visitCounterProvider }: { initialData: ReaderData; chapterEndAd?: AdPlacement; visitCounterProvider?: VisitCounterProvider }) {
  const chapterIds = useMemo(() => new Set(initialData.chapters.map((item) => item.id)), [initialData.chapters]);
  const [chapterId, setChapterId] = useState(() => readSavedProgress(chapterIds)?.chapterId ?? initialData.chapters[0].id);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const readingPaneRef = useRef<HTMLElement>(null);
  const restoreOnChapterChange = useRef(true);
  const chapter = initialData.chapters.find((item) => item.id === chapterId) as Chapter;
  const filtered = useMemo(() => initialData.chapters.filter((item) => item.title.includes(query)), [initialData.chapters, query]);
  const currentIndex = initialData.chapters.findIndex((item) => item.id === chapterId);

  useEffect(() => {
    trackPageView(`/chapter/${chapter.ordinal}`);
  }, [chapter.ordinal]);

  useEffect(() => {
    const pane = readingPaneRef.current;
    if (!pane) return;
    const saved = readSavedProgress(chapterIds);
    const targetTop = restoreOnChapterChange.current && saved?.chapterId === chapterId ? saved.scrollTop : 0;
    requestAnimationFrame(() => {
      pane.scrollTop = targetTop;
      saveReadingProgress(chapterId, targetTop);
      restoreOnChapterChange.current = false;
    });
  }, [chapterId, chapterIds]);

  useEffect(() => {
    const pane = readingPaneRef.current;
    if (!pane) return;
    const activePane = pane;
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        saveReadingProgress(chapterId, activePane.scrollTop);
      });
    }
    activePane.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      activePane.removeEventListener("scroll", onScroll);
    };
  }, [chapterId]);

  const selectedKey = selected ? `${selected.type}:${selected.id}` : "";
  useEffect(() => {
    if (!selected) return;
    trackEvent("entity", "view", selectedKey);
  }, [selectedKey]);

  function selectChapter(id: number, restore = false) {
    restoreOnChapterChange.current = restore;
    setChapterId(id);
    setSelected(null);
    setNavOpen(false);
  }

  return <main className="app-shell">
    <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setNavOpen(true)} aria-label="打开目录"><Menu/></button><div className="brand"><span className="brand-mark">史</span><div><strong>太史书</strong><small>史记数字阅读</small></div></div><div className="reading-progress"><span>正在阅读</span><strong>{chapter.title}</strong></div><div className="topbar-meta"><VisitCounter provider={visitCounterProvider} /><div className="legend"><span><i className="line person-line"/>人物</span><span><i className="line place-line"/>地名</span></div></div></header>
    <div className="workspace">
      <nav className={`chapter-nav ${navOpen ? "open" : ""}`}>
        <div className="nav-heading"><div><small>卷目</small><h2>史记百三十篇</h2></div><button className="mobile-close icon-button" onClick={() => setNavOpen(false)} aria-label="关闭目录"><X size={18}/></button></div>
        <div className="search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索篇目"/></div>
        <div className="chapter-list">{filtered.map((item) => <button key={item.id} className={item.id === chapterId ? "active" : ""} onClick={() => selectChapter(item.id)}><span>{String(item.ordinal).padStart(2, "0")}</span><div><strong>{item.title}</strong><small>{item.category}</small></div></button>)}</div>
        <div className="nav-foot"><BookOpen size={16}/><span>十二本纪全文 · 维基文库 CC BY-SA · <a href="/privacy">隐私说明</a></span></div>
      </nav>
      {navOpen && <button className="backdrop" onClick={() => setNavOpen(false)} aria-label="关闭目录"/>}
      <article className="reading-pane" ref={readingPaneRef}>
        <div className="paper">
          <div className="chapter-kicker">卷{chineseNumber(chapter.ordinal)} · {chapter.category}第{chineseNumber(chapter.ordinal)}</div><h1>{chapter.title}</h1><p className="chapter-subtitle">{chapter.subtitle}</p><div className="ornament"><span/><b>太史公曰</b><span/></div>
          <div className="prose">{chapter.paragraphs.length ? chapter.paragraphs.map((paragraph) => <MarkedParagraph key={paragraph.id} paragraph={paragraph} entities={initialData.entities} onSelect={setSelected}/>) : <div className="empty-chapter"><BookOpen size={30}/><p>该篇正文尚待导入</p></div>}</div>
          <AdSlot placement={chapterEndAd} name="chapter-end" />
          <footer className="chapter-pagination"><button disabled={currentIndex === 0} onClick={() => selectChapter(initialData.chapters[currentIndex - 1].id)}><ChevronLeft size={18}/>上一篇</button><span>第 {chapter.ordinal} 篇</span><button disabled={currentIndex === initialData.chapters.length - 1} onClick={() => selectChapter(initialData.chapters[currentIndex + 1].id)}>下一篇<ChevronRight size={18}/></button></footer>
        </div>
      </article>
      {selected && <EntityPanel key={selected.id} entity={selected} data={initialData} onClose={() => setSelected(null)}/>}
    </div>
  </main>;
}