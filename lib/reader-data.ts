import readerData from "@/data/reader-data.json";
import type { ReaderData } from "./types";

// Cloudflare Workers has no persistent local filesystem or Node SQLite runtime.
// The published reader is intentionally read-only and uses this build snapshot.
export const entityEditingEnabled = false;

export function getReaderData(): ReaderData {
  return readerData as ReaderData;
}
