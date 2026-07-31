import type { MetadataRoute } from "next";
import { getReaderData } from "@/lib/reader-data";
import { absoluteUrl, getChapterPath } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const chapters: MetadataRoute.Sitemap = getReaderData().chapters.map((chapter) => ({
    url: absoluteUrl(getChapterPath(chapter)),
    changeFrequency: "monthly",
    priority: chapter.ordinal === 1 ? 1 : 0.9,
  }));

  return [
    ...chapters,
    {
      url: absoluteUrl("/privacy"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
