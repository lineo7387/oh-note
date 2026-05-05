"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { FileText, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import type { BlockNoteDocument } from "@/lib/blocknote-types";

const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-pencil/40">
      Loading editor...
    </div>
  ),
});

interface NoteData {
  id: string;
  title: string;
  content: BlockNoteDocument;
  folderId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotePage() {
  const params = useParams();
  const noteId = params.id as string;
  const { error: toastError } = useToast();
  const setCurrentNote = useAppStore((s) => s.setCurrentNote);
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<BlockNoteDocument>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      setLoading(true);
      setCurrentNote(null);
      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setNote(data);
          setTitle(data.title);
          contentRef.current = data.content;
          setCurrentNote({
            id: data.id,
            title: data.title,
            content: data.content,
          });
        } else {
          toastError("Failed to load note");
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toastError("Failed to load note");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      ctrl.abort();
      setCurrentNote(null);
    };
  }, [noteId, toastError, setCurrentNote]);

  const saveNote = useCallback(
    async (updates: { title?: string; content?: BlockNoteDocument }) => {
      if (!note) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const updated = await res.json();
          setNote(updated);
          setHasChanges(false);
        } else {
          toastError("Failed to save note");
        }
      } catch {
        toastError("Failed to save note");
      } finally {
        setSaving(false);
      }
    },
    [note, noteId, toastError]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote({ title: newTitle });
    }, 800);
  };

  const handleContentChange = (content: BlockNoteDocument) => {
    contentRef.current = content;
    setHasChanges(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote({ content });
    }, 1200);
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title.trim() !== note?.title) {
      saveNote({ title: title.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    }
    if (e.key === "Escape") {
      setEditingTitle(false);
      setTitle(note?.title || "");
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (hasChanges) {
        saveNote({ title: title.trim(), content: contentRef.current });
      }
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && note) {
          saveNote({ title: title.trim(), content: contentRef.current });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasChanges, note, saveNote, title]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-paper text-pencil/40">
        <div className="text-lg">Loading note...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-paper text-pencil/40">
        <div className="text-center">
          <FileText size={48} strokeWidth={1.5} className="mx-auto mb-3" />
          <p className="text-lg">Note not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-paper">
      {/* Editor header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-pencil/20 px-3 py-3 md:px-6 md:py-4">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleRef}
              autoFocus
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleKeyDown}
              className="w-full border-2 border-pen-blue bg-white px-3 py-1 text-3xl font-bold text-pencil outline-none wobbly-sm"
              style={{ fontFamily: "var(--font-heading)" }}
            />
          ) : (
            <h1
              className="cursor-text text-3xl font-bold text-pencil"
              style={{ fontFamily: "var(--font-heading)" }}
              onClick={() => setEditingTitle(true)}
            >
              {note.title || "Untitled"}
            </h1>
          )}
          <p className="mt-1 flex items-center gap-2 text-sm text-pencil/40">
            <span>Last updated: {new Date(note.updatedAt).toLocaleString()}</span>
            {saving && (
              <span className="flex items-center gap-1 text-pen-blue">
                <Save size={12} strokeWidth={2.5} />
                Saving...
              </span>
            )}
            {hasChanges && !saving && (
              <span className="text-accent">Unsaved changes</span>
            )}
          </p>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto px-3 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-3xl">
          <div className="border-2 border-pencil bg-white p-4 shadow-sketch-subtle wobbly-sm">
            <Editor
              key={note.id}
              initialContent={note.content}
              onChange={handleContentChange}
              editable={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
