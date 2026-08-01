import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Reader from "@/components/reader";
import { getReaderData } from "@/lib/reader-data";
import { getChapterEndAd, getVisitCounterProvider } from "@/lib/site-config";
import { getChapterDescription, getChapterJsonLd, getChapterPath, getHomeJsonLd } from "@/lib/seo";

export const dynamic = "force-static";

type ChapterPageProps = {
  params: Promise<{ id: string }>;
};

function findChapter(id: string) {
  if (!/^\d+$/.test(id)) return undefined;
  return getReaderData().chapters.find((chapter) => chapter.id === Number(id));
}

export function generateStaticParams() {
  return getReaderData().chapters.map((chapter) => ({ id: String(chapter.id) }));
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const chapter = findChapter((await params).id);
  if (!chapter) return {};
  const path = getChapterPath(chapter);
  const title = `${chapter.title}原文`;
  const description = getChapterDescription(chapter);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "zh_CN",
      url: path,
      title,
      description,
    },
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const data = getReaderData();
  const chapter = findChapter((await params).id);
  if (!chapter) notFound();
  const jsonLd = chapter.id === data.chapters[0]?.id
    ? [...getHomeJsonLd(), getChapterJsonLd(chapter)]
    : getChapterJsonLd(chapter);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Reader
        initialData={data}
        initialChapterId={chapter.id}
        chapterEndAd={getChapterEndAd()}
        visitCounterProvider={getVisitCounterProvider()}
      />
    </>
  );
}
