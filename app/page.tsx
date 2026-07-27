import { entityEditingEnabled, getReaderData } from "@/lib/reader-data";
import Reader from "@/components/reader";

export const dynamic = "force-static";

export default function Home() {
  return <Reader initialData={getReaderData()} canEdit={entityEditingEnabled} />;
}
