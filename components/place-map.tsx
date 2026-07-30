"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Entity } from "@/lib/types";

type MapMode = "loading" | "ready" | "fallback";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function projectToPanel(latitude?: number, longitude?: number) {
  const lat = latitude ?? 35.5;
  const lng = longitude ?? 113.5;
  return {
    x: clamp(((lng - 104) / 18) * 100, 12, 88),
    y: clamp(((41 - lat) / 12) * 100, 14, 86),
  };
}

function FallbackMap({ entity }: { entity: Entity }) {
  const point = useMemo(() => projectToPanel(entity.latitude, entity.longitude), [entity.latitude, entity.longitude]);

  return <div className="ancient-vector-map" role="img" aria-label={`${entity.name} 的示意地图`}>
    <svg viewBox="0 0 320 260" preserveAspectRatio="none" aria-hidden="true">
      <path className="ancient-region" d="M44 67 C85 35 126 44 164 58 C206 73 252 62 285 93 C307 114 292 153 270 177 C238 213 190 223 145 211 C104 201 59 218 35 188 C12 158 16 96 44 67 Z" />
      <path className="ancient-river" d="M22 119 C62 106 82 125 116 118 C157 109 177 80 219 83 C254 85 275 105 303 99" />
      <path className="ancient-river" d="M82 218 C101 178 137 167 168 145 C195 127 218 106 249 74" />
      <g className="ancient-city important" transform="translate(105 108)">
        <circle r="5" />
        <text x="9" y="4">中原</text>
      </g>
      <g className="ancient-city" transform="translate(205 150)">
        <circle r="4" />
        <text x="8" y="4">齐鲁</text>
      </g>
      <g className="ancient-city" transform="translate(148 183)">
        <circle r="4" />
        <text x="8" y="4">淮泗</text>
      </g>
      <g className="ancient-current" transform={`translate(${(point.x / 100) * 320} ${(point.y / 100) * 260})`}>
        <circle r="8" />
        <circle r="3" />
        <text x="12" y="4">{entity.name}</text>
      </g>
    </svg>
    <div className="ancient-map-title"><strong>{entity.modernName ?? entity.name}</strong><span>底图不可用时的本地示意图</span></div>
    <div className="ancient-map-legend"><span><i className="legend-current"/>当前地点</span><span><i className="legend-city"/>参考区域</span><span><i className="legend-river"/>河流</span></div>
  </div>;
}

export default function PlaceMap({ entity }: { entity: Entity }) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const [mode, setMode] = useState<MapMode>("loading");

  useEffect(() => {
    let cancelled = false;
    let failedTiles = 0;
    let settled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled && !settled) {
        settled = true;
        setMode("fallback");
      }
    }, 8_000);

    async function initialize() {
      if (!mapNode.current || mapInstance.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapNode.current) return;

      const center: [number, number] = [entity.latitude ?? 32.5, entity.longitude ?? 118.5];
      const map = L.map(mapNode.current, { zoomControl: true, attributionControl: true }).setView(center, 8);
      mapInstance.current = map;

      const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim()
        || "/api/map-tiles/{z}/{x}/{y}.png";
      const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION?.trim()
        || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 18,
        attribution,
      });

      tileLayer.on("loading", () => {
        failedTiles = 0;
        settled = false;
        setMode("loading");
      });
      tileLayer.on("tileerror", () => {
        failedTiles += 1;
        if (failedTiles >= 2 && !settled) {
          settled = true;
          window.clearTimeout(fallbackTimer);
          setMode("fallback");
        }
      });
      tileLayer.on("load", () => {
        if (!cancelled && !settled) {
          settled = true;
          window.clearTimeout(fallbackTimer);
          setMode("ready");
        }
      });

      tileLayer.addTo(map);
      L.circleMarker(center, { radius: 7, color: "#fff", weight: 2, fillColor: "#a53e35", fillOpacity: 1 })
        .addTo(map)
        .bindTooltip(`${entity.name} · ${entity.modernName ?? "现代位置"}`, { permanent: true, direction: "top" });
    }

    initialize().catch(() => {
      if (!cancelled) {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setMode("fallback");
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [entity]);

  const isFallback = mode === "fallback";

  return <div className="real-map-wrap">
    <div ref={mapNode} className={`real-map modern${isFallback ? " map-hidden" : ""}`} />
    {isFallback && <FallbackMap entity={entity} />}
    {mode === "loading" && <div className="map-loading">正在加载地图…</div>}
    <div className="map-attribution">
      <strong>{entity.modernName ?? entity.name}</strong>
      <span>{isFallback ? "本地示意图 · 真实底图暂不可用" : "OpenStreetMap"}</span>
    </div>
  </div>;
}
