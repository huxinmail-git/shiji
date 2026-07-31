export type VisitCounterProvider = "busuanzi";

export interface AdPlacement {
  imageUrl: string;
  targetUrl: string;
  alt: string;
  sponsor: string;
}

function isWebUrl(value: string, allowRelative = false) {
  if (allowRelative && value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSiteUrl() {
  const value = process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://shijis.xyz";
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    console.warn("SITE_URL is invalid; using https://shijis.xyz.");
    return "https://shijis.xyz";
  }
}

export function getGoogleSiteVerification() {
  return process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
}

export function getBingSiteVerification() {
  return process.env.BING_SITE_VERIFICATION?.trim() || undefined;
}

export function getGoogleTagId() {
  const value = process.env.GOOGLE_TAG_ID?.trim() || process.env.NEXT_PUBLIC_GOOGLE_TAG_ID?.trim();
  if (!value) return undefined;
  if (/^(G|AW|GT|DC)-[A-Z0-9-]+$/i.test(value)) return value;
  console.warn("GOOGLE_TAG_ID is invalid; Google tracking is disabled.");
  return undefined;
}

export function getMicrosoftUetTagId() {
  const value = process.env.MICROSOFT_UET_TAG_ID?.trim() || process.env.NEXT_PUBLIC_MICROSOFT_UET_TAG_ID?.trim();
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return value;
  console.warn("MICROSOFT_UET_TAG_ID is invalid; Microsoft UET tracking is disabled.");
  return undefined;
}

export function getBaiduTrackingId() {
  const value = process.env.BAIDU_TONGJI_ID?.trim();
  if (!value) return undefined;
  if (/^[a-f0-9]{32}$/i.test(value)) return value;
  console.warn("BAIDU_TONGJI_ID is invalid; analytics is disabled.");
  return undefined;
}

export function getVisitCounterProvider(): VisitCounterProvider | undefined {
  const value = (process.env.VISIT_COUNTER_PROVIDER?.trim() || process.env.NEXT_PUBLIC_VISIT_COUNTER_PROVIDER?.trim() || "busuanzi").toLowerCase();
  if (["", "off", "none", "false", "disabled"].includes(value)) return undefined;
  if (value === "busuanzi") return value;
  console.warn("VISIT_COUNTER_PROVIDER is invalid; visit counter is hidden.");
  return undefined;
}

export function getChapterEndAd(): AdPlacement | undefined {
  const imageUrl = process.env.AD_CHAPTER_END_IMAGE_URL?.trim();
  const targetUrl = process.env.AD_CHAPTER_END_TARGET_URL?.trim();
  if (!imageUrl || !targetUrl) return undefined;
  if (!isWebUrl(imageUrl, true) || !isWebUrl(targetUrl)) {
    console.warn("Chapter-end ad URLs are invalid; the placement is hidden.");
    return undefined;
  }
  return {
    imageUrl,
    targetUrl,
    alt: process.env.AD_CHAPTER_END_ALT?.trim() || "推广内容",
    sponsor: process.env.AD_CHAPTER_END_SPONSOR?.trim() || "合作推广",
  };
}
