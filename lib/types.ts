export type EntityType = "PERSON" | "PLACE";

export interface Entity {
  id: number;
  type: EntityType;
  name: string;
  aliases: string[];
  summary: string;
  details: string;
  modernName?: string;
  latitude?: number;
  longitude?: number;
  sourceName?: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
}

export interface Annotation {
  id: number;
  paragraphId: number;
  entityId: number;
  startOffset: number;
  endOffset: number;
}

export interface Paragraph {
  id: number;
  content: string;
  annotations: Annotation[];
}

export interface Chapter {
  id: number;
  category: string;
  ordinal: number;
  title: string;
  subtitle: string;
  paragraphs: Paragraph[];
}

export interface Relation {
  id: number;
  sourceId: number;
  targetId: number;
  relationType: string;
  description: string;
}

export interface ReaderData {
  chapters: Chapter[];
  entities: Entity[];
  relations: Relation[];
}
