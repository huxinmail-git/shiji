"use client";

import { trackEvent } from "@/components/analytics";
import type { AdPlacement } from "@/lib/site-config";

export default function AdSlot({ placement, name }: { placement?: AdPlacement; name: string }) {
  if (!placement) return null;

  return (
    <aside className="ad-slot" aria-label="推广">
      <span className="ad-label">推广</span>
      <a
        href={placement.targetUrl}
        target="_blank"
        rel="sponsored noreferrer"
        onClick={() => trackEvent("advertising", "click", `${name}:${placement.sponsor}`)}
      >
        <img src={placement.imageUrl} alt={placement.alt} loading="lazy" referrerPolicy="no-referrer" />
      </a>
      <small>{placement.sponsor}</small>
    </aside>
  );
}
