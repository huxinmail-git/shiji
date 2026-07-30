import chapters from "@/data/chapters.json";
import entitiesConfig from "@/data/entities.json";
import relationsConfig from "@/data/relations.json";
import type { ReaderData } from "./types";

export function getReaderData(): ReaderData {
  return {
    chapters: chapters as ReaderData["chapters"],
    entities: entitiesConfig.entities as ReaderData["entities"],
    relations: relationsConfig.relations as ReaderData["relations"],
  };
}
