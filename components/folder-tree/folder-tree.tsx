"use client";

import { useState, useCallback, useEffect } from "react";
import { Folder, ChevronRight, ChevronDown, FolderOpen, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
  _count?: { notes: number; children: number };
}

interface FolderNodeProps {
  folder: FolderItem;
  depth: number;
  allFolders: FolderItem[];
}

function FolderNode({ folder, depth, allFolders }: FolderNodeProps) {
  const { selectedFolderId, setSelectedFolderId } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const [childName, setChildName] = useState("");

  const children = allFolders.filter((f) => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const handleToggle = useCallback(() => {
    if (hasChildren) setExpanded((e) => !e);
    setSelectedFolderId(folder.id);
  }, [hasChildren, folder.id, setSelectedFolderId]);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === folder.name) {
      setRenaming(false);
      setNewName(folder.name);
      return;
    }
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        useAppStore.getState().updateFolder(updated);
      }
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete folder "${folder.name}"?`)) return;
    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      if (res.ok) {
        useAppStore.getState().removeFolder(folder.id);
        if (selectedFolderId === folder.id) {
          setSelectedFolderId(null);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete folder");
      }
    } catch {
      alert("Failed to delete folder");
    }
    setMenuOpen(false);
  };

  const handleCreateChild = async () => {
    if (!childName.trim()) {
      setCreatingChild(false);
      return;
    }
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: childName.trim(), parentId: folder.id }),
      });
      if (res.ok) {
        const created = await res.json();
        useAppStore.getState().addFolder(created);
        setExpanded(true);
      }
    } finally {
      setCreatingChild(false);
      setChildName("");
    }
  };

  useEffect(() => {
    setNewName(folder.name);
  }, [folder.name]);

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-1.5 pr-2 cursor-pointer select-none transition-colors ${
          isSelected ? "bg-pen-blue/10" : "hover:bg-pencil/5"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleToggle}
      >
        <button
          className="flex h-5 w-5 items-center justify-center text-pencil/50"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((e) => !e);
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />
          ) : (
            <span className="w-[14px]" />
          )}
        </button>

        {isSelected ? (
          <FolderOpen size={16} className="shrink-0 text-pen-blue" strokeWidth={2.5} />
        ) : (
          <Folder size={16} className="shrink-0 text-pencil/60" strokeWidth={2.5} />
        )}

        {renaming ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setRenaming(false);
                setNewName(folder.name);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 border-2 border-pen-blue bg-white px-1.5 py-0.5 text-sm text-pencil outline-none wobbly-sm"
            style={{ fontFamily: "var(--font-body)" }}
          />
        ) : (
          <span className={`min-w-0 flex-1 truncate text-sm ${isSelected ? "font-bold text-pen-blue" : "text-pencil"}`}>
            {folder.name}
          </span>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="h-5 w-5 flex items-center justify-center text-pencil/40 hover:text-pen-blue"
            onClick={(e) => {
              e.stopPropagation();
              setCreatingChild(true);
            }}
            title="New subfolder"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>
          <div className="relative">
            <button
              className="h-5 w-5 flex items-center justify-center text-pencil/40 hover:text-pencil"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
            >
              <MoreHorizontal size={12} strokeWidth={2.5} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-6 z-20 min-w-[120px] border-2 border-pencil bg-white py-1 shadow-sketch wobbly-sm">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-pencil hover:bg-pencil/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil size={12} strokeWidth={2.5} /> Rename
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-accent hover:bg-accent/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 size={12} strokeWidth={2.5} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {creatingChild && (
        <div className="flex items-center gap-1 py-1 pr-2" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
          <Folder size={16} className="shrink-0 text-pencil/40" strokeWidth={2.5} />
          <input
            autoFocus
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onBlur={handleCreateChild}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateChild();
              if (e.key === "Escape") {
                setCreatingChild(false);
                setChildName("");
              }
            }}
            placeholder="Folder name..."
            className="min-w-0 flex-1 border-2 border-pen-blue bg-white px-1.5 py-0.5 text-sm text-pencil outline-none wobbly-sm"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      )}

      {expanded && children.map((child) => (
        <FolderNode key={child.id} folder={child} depth={depth + 1} allFolders={allFolders} />
      ))}
    </div>
  );
}

export default function FolderTree() {
  const { folders, setFolders, setSelectedFolderId, setLoadingFolders, loadingFolders } = useAppStore();
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    async function load() {
      setLoadingFolders(true);
      try {
        const res = await fetch("/api/folders");
        if (res.ok) {
          const data = await res.json();
          setFolders(data);
        }
      } finally {
        setLoadingFolders(false);
      }
    }
    load();
  }, [setFolders, setLoadingFolders]);

  const rootFolders = folders.filter((f) => !f.parentId);

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      setCreating(false);
      return;
    }
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        useAppStore.getState().addFolder(created);
        setSelectedFolderId(created.id);
      }
    } finally {
      setCreating(false);
      setNewFolderName("");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-xl font-bold text-pencil" style={{ fontFamily: "var(--font-heading)" }}>
          Folders
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="btn-sketch flex h-8 w-8 items-center justify-center border-2 border-pencil bg-white text-pencil shadow-sketch wobbly-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {creating && (
        <div className="mx-3 mb-2 flex items-center gap-1.5">
          <Folder size={16} className="shrink-0 text-pencil/40" strokeWidth={2.5} />
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setNewFolderName("");
              }
            }}
            placeholder="New folder..."
            className="min-w-0 flex-1 border-2 border-pen-blue bg-white px-2 py-1 text-sm text-pencil outline-none wobbly-sm"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {loadingFolders && folders.length === 0 && (
          <div className="px-3 py-4 text-sm text-pencil/50">Loading...</div>
        )}
        {rootFolders.map((folder) => (
          <FolderNode key={folder.id} folder={folder} depth={0} allFolders={folders} />
        ))}
        {!loadingFolders && rootFolders.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-pencil/50">
            No folders yet.
            <br />
            Click + to create one!
          </div>
        )}
      </div>
    </div>
  );
}
