"use client";

import { useState, useCallback, useEffect } from "react";
import { Folder, ChevronRight, ChevronDown, FolderOpen, Plus, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAppStore, type Folder as FolderItem } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { useAsyncAction } from "@/lib/use-async-action";

interface FolderTreeProps {
  initialFolders: FolderItem[];
}

interface FolderNodeProps {
  folder: FolderItem;
  depth: number;
  allFolders: FolderItem[];
}

function FolderNode({ folder, depth, allFolders }: FolderNodeProps) {
  const { selectedFolderId, setSelectedFolderId } = useAppStore();
  const { error, success } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const [childName, setChildName] = useState("");

  const { loading: isRenaming, run: runRename } = useAsyncAction();
  const { loading: isDeleting, run: runDelete } = useAsyncAction();
  const { loading: isSavingChild, run: runCreateChild } = useAsyncAction();

  const children = allFolders.filter((f) => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const handleToggle = useCallback(() => {
    if (hasChildren) setExpanded((e) => !e);
    setSelectedFolderId(folder.id);
    setSidebarOpen(false);
  }, [hasChildren, folder.id, setSelectedFolderId, setSidebarOpen]);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === folder.name) {
      setRenaming(false);
      setNewName(folder.name);
      return;
    }

    await runRename(async () => {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        useAppStore.getState().updateFolder(updated);
        success(`Renamed to "${updated.name}"`);
      } else {
        const data = await res.json();
        error(data.error || "Failed to rename folder");
      }
    });
    setRenaming(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete folder "${folder.name}"?`)) return;

    await runDelete(async () => {
      const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      if (res.ok) {
        useAppStore.getState().removeFolder(folder.id);
        if (selectedFolderId === folder.id) {
          setSelectedFolderId(null);
        }
        success(`Folder "${folder.name}" deleted`);
      } else {
        const data = await res.json();
        error(data.error || "Failed to delete folder");
      }
    });
    setMenuOpen(false);
  };

  const handleCreateChild = async () => {
    if (!childName.trim()) {
      setCreatingChild(false);
      return;
    }

    await runCreateChild(async () => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: childName.trim(), parentId: folder.id }),
      });
      if (res.ok) {
        const created = await res.json();
        useAppStore.getState().addFolder(created);
        setExpanded(true);
        success(`Folder "${created.name}" created`);
      }
    });
    setCreatingChild(false);
    setChildName("");
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

        {!renaming && (isSelected ? (
          <FolderOpen size={16} className="shrink-0 text-pen-blue" strokeWidth={2.5} />
        ) : (
          <Folder size={16} className="shrink-0 text-pencil/60" strokeWidth={2.5} />
        ))}

        {renaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {isRenaming ? (
              <span className="shrink-0 h-4 w-4 animate-spin rounded-full border-2 border-pencil/30 border-t-pen-blue" />
            ) : (
              <Folder size={16} className="shrink-0 text-pencil/40" strokeWidth={2.5} />
            )}
            <input
              autoFocus
              disabled={isRenaming}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  if (!isRenaming) {
                    setRenaming(false);
                    setNewName(folder.name);
                  }
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder={isRenaming ? "Renaming..." : undefined}
              className="min-w-0 flex-1 border-2 border-pen-blue bg-white px-2 py-1 text-sm text-pencil outline-none wobbly-sm disabled:opacity-50"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
        ) : (
          <span className={`min-w-0 flex-1 truncate text-sm ${isSelected ? "font-bold text-pen-blue" : "text-pencil"}`}>
            {folder.name}
          </span>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="h-5 w-5 flex items-center justify-center text-pencil/40 hover:text-pen-blue disabled:opacity-30"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSavingChild) setCreatingChild(true);
            }}
            disabled={isSavingChild}
            title="New subfolder"
          >
            {isSavingChild ? (
              <Loader2 size={12} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Plus size={12} strokeWidth={2.5} />
            )}
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
                    disabled={isDeleting}
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
          {isSavingChild ? (
            <span className="shrink-0 h-4 w-4 animate-spin rounded-full border-2 border-pencil/30 border-t-pen-blue" />
          ) : (
            <Folder size={16} className="shrink-0 text-pencil/40" strokeWidth={2.5} />
          )}
          <input
            autoFocus
            disabled={isSavingChild}
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onBlur={handleCreateChild}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateChild();
              if (e.key === "Escape") {
                if (!isSavingChild) {
                  setCreatingChild(false);
                  setChildName("");
                }
              }
            }}
            placeholder={isSavingChild ? "Creating..." : "Folder name..."}
            className="min-w-0 flex-1 border-2 border-pen-blue bg-white px-1.5 py-0.5 text-sm text-pencil outline-none wobbly-sm disabled:opacity-50"
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

export default function FolderTree({ initialFolders }: FolderTreeProps) {
  const { folders, setFolders, setSelectedFolderId } = useAppStore();
  const { success, error: toastError } = useToast();
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { loading: isSaving, run: runCreate } = useAsyncAction();

  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders, setFolders]);

  const rootFolders = folders.filter((f) => !f.parentId);

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      setCreating(false);
      return;
    }

    await runCreate(async () => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        useAppStore.getState().addFolder(created);
        setSelectedFolderId(created.id);
        success(`Folder "${created.name}" created`);
      } else {
        toastError("Failed to create folder");
      }
    });
    setCreating(false);
    setNewFolderName("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-xl font-bold text-pencil" style={{ fontFamily: "var(--font-heading)" }}>
          Folders
        </h2>
        <button
          onClick={() => {
            if (!isSaving) setCreating(true);
          }}
          disabled={isSaving}
          className="btn-sketch flex h-8 w-8 items-center justify-center border-2 border-pencil bg-white text-pencil shadow-sketch wobbly-sm disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
          ) : (
            <Plus size={16} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {creating && (
        <div className="mx-3 mb-2 flex items-center gap-1.5">
          {isSaving ? (
            <span className="shrink-0 h-4 w-4 animate-spin rounded-full border-2 border-pencil/30 border-t-pen-blue" />
          ) : (
            <Folder size={16} className="shrink-0 text-pencil/40" strokeWidth={2.5} />
          )}
          <input
            autoFocus
            disabled={isSaving}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                if (!isSaving) {
                  setCreating(false);
                  setNewFolderName("");
                }
              }
            }}
            placeholder={isSaving ? "Creating..." : "New folder..."}
            className="min-w-0 flex-1 border-2 border-pen-blue bg-white px-2 py-1 text-sm text-pencil outline-none wobbly-sm disabled:opacity-50"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {rootFolders.map((folder) => (
          <FolderNode key={folder.id} folder={folder} depth={0} allFolders={folders} />
        ))}
        {rootFolders.length === 0 && (
          <div className="flex flex-col items-center justify-center px-3 py-8 text-center text-pencil/40">
            <FolderOpen size={40} strokeWidth={1.5} className="mb-2" />
            <p className="text-sm font-bold">No folders yet</p>
            <p className="mt-1 text-xs">Click + to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}
