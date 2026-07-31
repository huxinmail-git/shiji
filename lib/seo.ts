import { getReaderData } from "@/lib/reader-data";
import { getSiteUrl } from "@/lib/site-config";

export const SITE_NAME = "太史书";
export const SITE_TITLE = "太史书 · 史记数字阅读";
export const SITE_DESCRIPTION = "面向《史记》的静态数字阅读器，提供十二本纪原文阅读、人物地名标注、关系梳理和地理位置展示。";
export const SEO_KEYWORDS = ["史记", "太史公", "司马迁", "史记原文", "史记阅读", "中国古代史", "文言文", "十二本纪"];

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl() + "/").toString();
}

export function getChapterAnchors() {
  return getReaderData().chapters.map((chapter) => ({
    title: chapter.title,
    ordinal: chapter.ordinal,
    url: absoluteUrl("/#chapter-" + chapter.ordinal),
  }));
}

export function getHomeJsonLd() {
  const chapters = getChapterAnchors();
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      inLanguage: "zh-CN",
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_TITLE,
      url: absoluteUrl("/"),
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      inLanguage: "zh-CN",
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "史记十二本纪篇目",
      itemListElement: chapters.map((chapter, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: chapter.title,
        url: chapter.url,
      })),
    },
  ];
}
