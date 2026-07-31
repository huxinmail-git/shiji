import { getReaderData } from "@/lib/reader-data";
import Reader from "@/components/reader";
import { getChapterEndAd, getVisitCounterProvider } from "@/lib/site-config";
import { getHomeJsonLd } from "@/lib/seo";

export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getHomeJsonLd()) }}
      />
      <Reader initialData={getReaderData()} chapterEndAd={getChapterEndAd()} visitCounterProvider={getVisitCounterProvider()} />
    </>
  );
}
