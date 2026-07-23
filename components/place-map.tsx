"use client";

import { useEffect, useRef, useState } from "react";
import type { Entity } from "@/lib/types";

export default function PlaceMap({ entity }: { entity: Entity }) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const [status, setStatus] = useState("正在加载地图…");

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      if (!mapNode.current || mapInstance.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapNode.current) return;
      const center: [number, number] = [entity.latitude ?? 32.5, entity.longitude ?? 118.5];
      const map = L.map(mapNode.current, { zoomControl: true, attributionControl: true }).setView(center, 8);
      mapInstance.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.circleMarker(center, { radius: 7, color: "#fff", weight: 2, fillColor: "#a53e35", fillOpacity: 1 })
        .addTo(map)
        .bindTooltip(`${entity.name} · ${entity.modernName ?? "现代位置"}`, { permanent: true, direction: "top" });
      setStatus("");
    }
    initialize();
    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [entity]);

  return <div className="real-map-wrap">
    <div ref={mapNode} className="real-map modern" />
    {status && <div className="map-loading">{status}</div>}
    <div className="map-attribution"><strong>{entity.modernName}</strong><span>OpenStreetMap</span></div>
  </div>;
}
