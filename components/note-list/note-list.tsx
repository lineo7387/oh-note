"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Loader2, Upload } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { SkeletonNote } from "@/components/ui/skeleton";
import { useAsyncAction } from "@/lib/use-async-action";
import ImportModal from "@/components/import-modal";

export default function NoteList() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { notes, selectedFolderId, selectedNoteId, setNotes, setSelectedNoteId, loadingNotes, setLoadingNotes, setSidebarOpen } = useAppStore();
  const [showImport, setShowImport] = useState(false);

  const { loading: creating, run: runCreate } = useAsyncAction();

  useEffect(() => {
    if (!selectedFolderId) {
      setNotes([]);
      return;
    }
    async function load() {
      setLoadingNotes(true);
      try {
        const res = await fetch(`/api/notes?folderId=${selectedFolderId}`);
        if (res.ok) {
          const data = await res.json();
          setNotes(data);
        } else {
          toastError("Failed to load notes");
        }
      } catch {
        toastError("Failed to load notes");
      } finally {
        setLoadingNotes(false);
      }
    }
    load();
  }, [selectedFolderId, setNotes, setLoadingNotes]);

  const handleCreate = async () => {
    if (!selectedFolderId) return;

    await runCreate(async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", folderId: selectedFolderId }),
      });
      if (res.ok) {
        const note = await res.json();
        useAppStore.getState().addNote(note);
        setSelectedNoteId(note.id);
        success("Note created");
      } else {
        toastError("Failed to create note");
      }
    });
  };

  if (!selectedFolderId) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center text-pencil/40">
        <FileText size={48} strokeWidth={1.5} className="mb-3" />
        <p className="text-lg">Select a folder to see notes</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-xl font-bold text-pencil" style={{ fontFamily: "var(--font-heading)" }}>
          Notes
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowImport(true)}
            disabled={!selectedFolderId || creating}
            className="btn-sketch flex h-8 w-8 items-center justify-center border-2 border-pencil bg-white text-pencil shadow-sketch wobbly-sm disabled:opacity-50"
            title="Import Markdown"
          >
            <Upload size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-sketch flex h-8 w-8 items-center justify-center border-2 border-pencil bg-white text-pencil shadow-sketch wobbly-sm disabled:opacity-50"
          >
            {creating ? (
              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Plus size={16} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {loadingNotes && notes.length === 0 && <SkeletonNote count={4} />}
        {notes.map((note) => {
          const isSelected = selectedNoteId === note.id;
          return (
            <div
              key={note.id}
              onClick={() => {
                setSelectedNoteId(note.id);
                setSidebarOpen(false);
                router.push(`/note/${note.id}`);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
                isSelected ? "bg-pen-blue/10" : "hover:bg-pencil/5"
              }`}
            >
              <FileText size={16} className={isSelected ? "text-pen-blue" : "text-pencil/50"} strokeWidth={2.5} />
              <span className={`min-w-0 flex-1 truncate text-sm ${isSelected ? "font-bold text-pen-blue" : "text-pencil"}`}>
                {note.title}
              </span>
            </div>
          );
        })}
        {!loadingNotes && notes.length === 0 && (
          <div className="flex flex-col items-center justify-center px-3 py-8 text-center text-pencil/40">
            <FileText size={40} strokeWidth={1.5} className="mb-2" />
            <p className="text-sm font-bold">No notes yet</p>
            <p className="mt-1 text-xs">Click + to create one</p>
          </div>
        )}
      </div>
      {showImport && (
        <ImportModal
          folderId={selectedFolderId}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
