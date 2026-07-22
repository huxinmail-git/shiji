"use client";

import { useEffect, useRef, useState } from "react";
import type { Entity } from "@/lib/types";

export default function PlaceMap({ entity }: { entity: Entity }) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const modernTiles = useRef<import("leaflet").TileLayer | null>(null);
  const modernMarker = useRef<import("leaflet").CircleMarker | null>(null);
  const historicalLayer = useRef<import("leaflet").GeoJSON | null>(null);
  const [era, setEra] = useState<"ancient" | "modern">("modern");
  const [status, setStatus] = useState("正在加载地图…");

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      if (!mapNode.current || mapInstance.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapNode.current) return;
      const center: [number, number] = [entity.latitude ?? 32.5, entity.longitude ?? 118.5];
      const map = L.map(mapNode.current, { zoomControl: true, attributionControl: true }).setView(center, 7);
      mapInstance.current = map;
      modernTiles.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      modernMarker.current = L.circleMarker(center, { radius: 7, color: "#fff", weight: 2, fillColor: "#a53e35", fillOpacity: 1 })
        .addTo(map).bindTooltip(`${entity.name} · ${entity.modernName ?? "现代位置"}`, { permanent: true, direction: "top" });
      try {
        const response = await fetch("/data/qin-east.geojson");
        const geojson = await response.json();
        if (cancelled) return;
        historicalLayer.current = L.geoJSON(geojson, {
          style: (feature) => feature?.geometry.type === "Polygon"
            ? { color: "#8a5f39", weight: 1.5, fillColor: "#c5aa74", fillOpacity: 0.28 }
            : { color: "#557f91", weight: 1.5, opacity: 0.75 },
          pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            radius: feature.properties?.name === entity.name ? 7 : feature.properties?.icon === "province" ? 5 : 3,
            color: feature.properties?.name === entity.name ? "#fff" : "#704a2d",
            fillColor: feature.properties?.name === entity.name ? "#a53e35" : "#f3dfae",
            fillOpacity: 1,
            weight: feature.properties?.name === entity.name ? 2 : 1,
          }),
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.name;
            if (!name) return;
            const permanent = feature.geometry.type === "Point"
              && (feature.properties?.icon === "province" || name === entity.name);
            layer.bindTooltip(name, permanent
              ? { permanent: true, direction: "right", className: "ancient-place-label", offset: [5, 0] }
              : { sticky: true, className: "ancient-hover-label" });
          },
        });
        setStatus("");
      } catch {
        setStatus("古代图层加载失败");
      }
    }
    initialize();
    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [entity]);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = historicalLayer.current;
    if (!map || !layer) return;
    if (era === "ancient") {
      modernTiles.current?.removeFrom(map);
      modernMarker.current?.removeFrom(map);
      layer.addTo(map);
      map.setZoom(Math.max(map.getZoom(), 7));
    } else {
      layer.removeFrom(map);
      modernTiles.current?.addTo(map);
      modernMarker.current?.addTo(map);
    }
  }, [era, status]);

  return <div className="real-map-wrap">
    <div className="map-switch" role="group" aria-label="地图时代">
      <button className={era === "ancient" ? "active" : ""} onClick={() => setEra("ancient")}>古代</button>
      <button className={era === "modern" ? "active" : ""} onClick={() => setEra("modern")}>现代</button>
    </div>
    <div ref={mapNode} className={`real-map ${era}`} />
    {status && <div className="map-loading">{status}</div>}
    <div className="map-attribution">
      {era === "ancient" ? <><strong>秦代郡县</strong><span>观沧海 · Circuare · CC BY-SA</span></> : <><strong>{entity.modernName}</strong><span>OpenStreetMap</span></>}
    </div>
  </div>;
}
