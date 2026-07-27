import { NextResponse } from "next/server";

const DEFAULT_TILE_UPSTREAM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const FALLBACK_CACHE_CONTROL = "public, max-age=604800, s-maxage=604800";

type RouteContext = {
  params: Promise<{ z: string; x: string; y: string }>;
};

function parseTileCoordinate(value: string, allowExtension = false) {
  const match = value.match(allowExtension ? /^(\d+)\.png$/ : /^(\d+)$/);
  return match ? Number(match[1]) : Number.NaN;
}

function buildUpstreamUrl(template: string, z: number, x: number, y: number) {
  const tileUrl = template
    .replaceAll("{z}", String(z))
    .replaceAll("{x}", String(x))
    .replaceAll("{y}", String(y));
  const url = new URL(tileUrl);
  if (url.protocol !== "https:") throw new Error("Map tile upstream must use HTTPS");
  return url;
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const z = parseTileCoordinate(params.z);
  const x = parseTileCoordinate(params.x);
  const y = parseTileCoordinate(params.y, true);
  const maximumCoordinate = Number.isInteger(z) && z >= 0 && z <= 18
    ? (2 ** z) - 1
    : -1;

  if (
    !Number.isInteger(x)
    || !Number.isInteger(y)
    || x < 0
    || y < 0
    || x > maximumCoordinate
    || y > maximumCoordinate
  ) {
    return NextResponse.json({ error: "无效的地图瓦片坐标" }, { status: 400 });
  }

  try {
    const upstream = buildUpstreamUrl(
      process.env.MAP_TILE_UPSTREAM_URL?.trim() || DEFAULT_TILE_UPSTREAM,
      z,
      x,
      y,
    );
    const response = await fetch(upstream, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
        Referer: "https://shijis.xyz/",
        "User-Agent": "Shiji/0.1 (+https://shijis.xyz)",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "地图瓦片服务暂时不可用" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const cacheControl = response.headers.get("cache-control") || FALLBACK_CACHE_CONTROL;
    const headers = new Headers({
      "Cache-Control": cacheControl,
      "Content-Type": contentType,
      "Cloudflare-CDN-Cache-Control": cacheControl,
    });
    const etag = response.headers.get("etag");
    const lastModified = response.headers.get("last-modified");
    if (etag) headers.set("ETag", etag);
    if (lastModified) headers.set("Last-Modified", lastModified);

    return new Response(response.body, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: "地图瓦片服务暂时不可用" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
