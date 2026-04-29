// Minimal type-safe representation of BlockNote JSON document structure
// Used to avoid `any` when interfacing with BlockNote APIs

export interface BlockNoteInlineContent {
  type: string;
  text: string;
  styles?: Record<string, boolean | string | number>;
}

export interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInlineContent[] | string;
  children?: BlockNoteBlock[];
}

export type BlockNoteDocument = BlockNoteBlock[];
