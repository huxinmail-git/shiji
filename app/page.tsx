import { getReaderData } from "@/lib/db";
import Reader from "@/components/reader";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Reader initialData={getReaderData()} />;
}
