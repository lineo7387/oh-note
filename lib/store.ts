import { create } from "zustand";
import type { BlockNoteDocument } from "@/lib/blocknote-types";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
  _count?: {
    notes: number;
    children: number;
  };
}

export interface Note {
  id: string;
  title: string;
  folderId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentNote {
  id: string;
  title: string;
  content: BlockNoteDocument;
}

interface AppState {
  folders: Folder[];
  notes: Note[];
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  aiOpen: boolean;
  loadingFolders: boolean;
  loadingNotes: boolean;
  sidebarOpen: boolean;
  currentNote: CurrentNote | null;
  setFolders: (folders: Folder[]) => void;
  setNotes: (notes: Note[]) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  setAiOpen: (open: boolean) => void;
  setLoadingFolders: (loading: boolean) => void;
  setLoadingNotes: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentNote: (note: CurrentNote | null) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  removeNote: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  folders: [],
  notes: [],
  selectedFolderId: null,
  selectedNoteId: null,
  aiOpen: false,
  loadingFolders: false,
  loadingNotes: false,
  sidebarOpen: false,
  currentNote: null,
  setFolders: (folders) => set({ folders }),
  setNotes: (notes) => set({ notes }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id, notes: [], selectedNoteId: null }),
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setAiOpen: (open) => set({ aiOpen: open }),
  setLoadingFolders: (loading) => set({ loadingFolders: loading }),
  setLoadingNotes: (loading) => set({ loadingNotes: loading }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentNote: (note) => set({ currentNote: note }),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  updateFolder: (folder) =>
    set((state) => ({
      folders: state.folders.map((f) => (f.id === folder.id ? folder : f)),
    })),
  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    })),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (note) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? note : n)),
    })),
  removeNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
    })),
}));
