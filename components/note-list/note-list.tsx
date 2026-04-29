"use client";

import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import Link from "next/link";

export default function NoteList() {
  const { notes, selectedFolderId, selectedNoteId, setNotes, setSelectedNoteId, loadingNotes, setLoadingNotes } = useAppStore();
  const [creating, setCreating] = useState(false);

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
        }
      } finally {
        setLoadingNotes(false);
      }
    }
    load();
  }, [selectedFolderId, setNotes, setLoadingNotes]);

  const handleCreate = async () => {
    if (!selectedFolderId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", folderId: selectedFolderId }),
      });
      if (res.ok) {
        const note = await res.json();
        useAppStore.getState().addNote(note);
        setSelectedNoteId(note.id);
      }
    } finally {
      setCreating(false);
    }
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
        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn-sketch flex h-8 w-8 items-center justify-center border-2 border-pencil bg-white text-pencil shadow-sketch wobbly-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {loadingNotes && notes.length === 0 && (
          <div className="px-3 py-4 text-sm text-pencil/50">Loading...</div>
        )}
        {notes.map((note) => {
          const isSelected = selectedNoteId === note.id;
          return (
            <Link
              key={note.id}
              href={`/note/${note.id}`}
              onClick={() => setSelectedNoteId(note.id)}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                isSelected ? "bg-pen-blue/10" : "hover:bg-pencil/5"
              }`}
            >
              <FileText size={16} className={isSelected ? "text-pen-blue" : "text-pencil/50"} strokeWidth={2.5} />
              <span className={`min-w-0 flex-1 truncate text-sm ${isSelected ? "font-bold text-pen-blue" : "text-pencil"}`}>
                {note.title}
              </span>
            </Link>
          );
        })}
        {!loadingNotes && notes.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-pencil/50">
            No notes in this folder.
            <br />
            Click + to create one!
          </div>
        )}
      </div>
    </div>
  );
}
