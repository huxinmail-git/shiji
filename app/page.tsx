import { entityEditingEnabled, getReaderData } from "@/lib/reader-data";
import Reader from "@/components/reader";
import { getChapterEndAd, getVisitCounterProvider } from "@/lib/site-config";

export const dynamic = "force-static";

export default function Home() {
  return <Reader initialData={getReaderData()} canEdit={entityEditingEnabled} chapterEndAd={getChapterEndAd()} visitCounterProvider={getVisitCounterProvider()} />;
}
