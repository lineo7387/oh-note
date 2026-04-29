"use client";

import { useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { BlockNoteEditor } from "@blocknote/core";
import type { BlockNoteDocument } from "@/lib/blocknote-types";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";

interface EditorProps {
  initialContent?: unknown;
  onChange?: (content: BlockNoteDocument) => void;
  editable?: boolean;
}

export default function Editor({ initialContent, onChange, editable = true }: EditorProps) {
  const editor = useCreateBlockNote();
  const hasSetContent = useRef(false);

  // Set initial content when editor is ready
  useEffect(() => {
    if (!editor || !initialContent || hasSetContent.current) return;

    const arr = Array.isArray(initialContent) ? (initialContent as BlockNoteDocument) : [];
    if (arr.length > 0) {
      const doc = editor.document;
      editor.replaceBlocks(doc, arr as Parameters<BlockNoteEditor["replaceBlocks"]>[1]);
      hasSetContent.current = true;
    }
  }, [editor, initialContent]);

  // Reset content flag on mount
  useEffect(() => {
    hasSetContent.current = false;
  }, []);

  // Listen for changes
  useEffect(() => {
    if (!editor || !onChange) return;

    const cleanup = editor.onChange(() => {
      onChange(editor.document as BlockNoteDocument);
    });

    return () => cleanup();
  }, [editor, onChange]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      className="bn-editor-wrapper"
    />
  );
}

// Extract plain text from BlockNote JSON for AI context
export function extractTextFromBlocks(content: unknown): string {
  if (!Array.isArray(content)) return "";

  const texts: string[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as Record<string, unknown>;

    if (b.type === "paragraph" || b.type === "heading") {
      const contentArr = b.content;
      if (Array.isArray(contentArr)) {
        for (const inline of contentArr) {
          if (typeof inline === "object" && inline !== null) {
            const text = (inline as Record<string, unknown>).text;
            if (typeof text === "string") texts.push(text);
          }
        }
      }
    }

    const children = b.children;
    if (Array.isArray(children)) {
      texts.push(extractTextFromBlocks(children));
    }
  }

  return texts.join("\n").trim();
}
