"use client";

import { useState, useRef, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { X, FileUp, FolderUp, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import type { BlockNoteDocument } from "@/lib/blocknote-types";
import type { Folder } from "@/lib/store";

interface ImportModalProps {
  folderId: string | null;
  onClose: () => void;
}

interface ImportProgress {
  total: number;
  done: number;
  current: string;
  phase: "idle" | "running" | "done" | "error";
  error?: string;
}

const IMAGE_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

function rewriteImageUrls(markdown: string): string {
  return markdown.replace(IMAGE_REGEX, (_match, alt, url) => {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    return `![${alt}](${proxyUrl})`;
  });
}

export default function ImportModal({ folderId, onClose }: ImportModalProps) {
  const { success, error: toastError } = useToast();
  const { folders, addFolder, addNote } = useAppStore();
  const editor = useCreateBlockNote();
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    done: 0,
    current: "",
    phase: "idle",
  });
  const [newFolderName, setNewFolderName] = useState("");
  const singleFileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const createFolder = useCallback(
    async (name: string, parentId: string | null): Promise<Folder> => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create folder "${name}"`);
      }
      return res.json();
    },
    []
  );

  const createNote = useCallback(
    async (title: string, folderId: string, content: BlockNoteDocument) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, folderId, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create note "${title}"`);
      }
      return res.json();
    },
    []
  );

  const parseMarkdown = useCallback(
    async (markdown: string): Promise<BlockNoteDocument> => {
      const blocks = await editor.tryParseMarkdownToBlocks(markdown);
      return blocks as BlockNoteDocument;
    },
    [editor]
  );

  const resolveTargetFolder = useCallback(async (): Promise<string | null> => {
    if (newFolderName.trim()) {
      const folder = await createFolder(newFolderName.trim(), folderId);
      addFolder(folder);
      return folder.id;
    }
    return folderId;
  }, [newFolderName, folderId, createFolder, addFolder]);

  const handleSingleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const mdFiles = Array.from(files).filter((f) =>
        f.name.toLowerCase().endsWith(".md")
      );
      if (mdFiles.length === 0) {
        toastError("No .md files selected");
        return;
      }

      let targetId = await resolveTargetFolder();
      if (!targetId) {
        const folder = await createFolder("Imported", null);
        addFolder(folder);
        targetId = folder.id;
      }

      abortRef.current = false;
      setProgress({ total: mdFiles.length, done: 0, current: "", phase: "running" });

      for (let i = 0; i < mdFiles.length; i++) {
        if (abortRef.current) break;

        const file = mdFiles[i];
        const title = file.name.replace(/\.md$/i, "");
        setProgress((p) => ({ ...p, current: title }));

        try {
          const markdown = await file.text();
          const processedMarkdown = rewriteImageUrls(markdown);
          const blocks = await parseMarkdown(processedMarkdown);
          await createNote(title, targetId, blocks);
          setProgress((p) => ({ ...p, done: i + 1 }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setProgress((p) => ({ ...p, phase: "error", error: msg }));
          toastError(`Import failed: ${msg}`);
          return;
        }
      }

      if (!abortRef.current) {
        setProgress((p) => ({ ...p, phase: "done" }));
        success(`Imported ${mdFiles.length} note${mdFiles.length > 1 ? "s" : ""}`);
      }
    },
    [toastError, success, parseMarkdown, createNote, resolveTargetFolder]
  );

  const handleFolder = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const mdFiles = Array.from(files).filter((f) =>
        f.name.toLowerCase().endsWith(".md")
      );
      if (mdFiles.length === 0) {
        toastError("No .md files found in selected folder");
        return;
      }

      const targetId = await resolveTargetFolder();

      abortRef.current = false;
      setProgress({ total: mdFiles.length, done: 0, current: "", phase: "running" });

      // Build a mutable copy of folders for lookup during import
      let localFolders = [...folders];
      const folderIdMap = new Map<string, string>(); // key: "parentId/name" -> folderId

      for (const f of localFolders) {
        folderIdMap.set(`${f.parentId || "null"}/${f.name}`, f.id);
      }

      for (let i = 0; i < mdFiles.length; i++) {
        if (abortRef.current) break;

        const file = mdFiles[i];
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const parts = relativePath.split("/");
        const fileName = parts.pop() || file.name;
        const title = fileName.replace(/\.md$/i, "");

        setProgress((p) => ({ ...p, current: relativePath }));

        try {
          let currentParentId = targetId;

          // Create or navigate folder hierarchy
          for (const part of parts) {
            const mapKey = `${currentParentId || "null"}/${part}`;
            let existingId = folderIdMap.get(mapKey);

            if (!existingId) {
              const newFolder = await createFolder(part, currentParentId);
              addFolder(newFolder);
              localFolders.push(newFolder);
              existingId = newFolder.id;
              folderIdMap.set(mapKey, existingId);
            }
            currentParentId = existingId;
          }

          const markdown = await file.text();
          const processedMarkdown = rewriteImageUrls(markdown);
          const blocks = await parseMarkdown(processedMarkdown);
          const note = await createNote(title, currentParentId, blocks);
          addNote(note);
          setProgress((p) => ({ ...p, done: i + 1 }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setProgress((p) => ({ ...p, phase: "error", error: msg }));
          toastError(`Import failed: ${msg}`);
          return;
        }
      }

      if (!abortRef.current) {
        setProgress((p) => ({ ...p, phase: "done" }));
        success(`Imported ${mdFiles.length} note${mdFiles.length > 1 ? "s" : ""}`);
      }
    },
    [folders, toastError, success, parseMarkdown, createFolder, createNote, addFolder, addNote, resolveTargetFolder]
  );

  const handleCancel = () => {
    abortRef.current = true;
    setProgress((p) => ({ ...p, phase: "idle" }));
  };

  const canImport = progress.phase !== "running";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md border-2 border-pencil bg-paper shadow-sketch wobbly">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-pencil/20 px-4 py-3">
          <h3
            className="text-lg font-bold text-pencil"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Import Markdown
          </h3>
          <button
            onClick={onClose}
            disabled={progress.phase === "running"}
            className="flex h-7 w-7 items-center justify-center text-pencil/60 hover:text-accent disabled:opacity-50"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {progress.phase === "idle" && (
            <div className="space-y-3">
              <div className="rounded border border-pencil/10 bg-white px-3 py-2">
                <div className="mb-1 text-xs text-pencil/50">Target folder</div>
                <div className="flex items-center gap-1.5 text-sm text-pencil">
                  {folderId ? (
                    <>
                      <FolderUp size={14} strokeWidth={2} className="text-pencil/50" />
                      <span className="truncate">{folders.find((f) => f.id === folderId)?.name || "Selected folder"}</span>
                    </>
                  ) : (
                    <>
                      <FolderUp size={14} strokeWidth={2} className="text-pencil/50" />
                      <span className="text-pencil/60">Root (no parent folder)</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-pencil/50">
                  Create new subfolder (optional)
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="my-folder"
                  className="input-sketch w-full border-2 border-pencil bg-white px-3 py-2 text-sm text-pencil placeholder:text-pencil/40 wobbly-sm"
                />
              </div>

              <p className="text-sm text-pencil/60">
                Import Markdown files into the currently selected folder.
                Network images will be proxied automatically.
              </p>

              <button
                onClick={() => singleFileRef.current?.click()}
                disabled={!canImport}
                className="btn-sketch flex w-full items-center gap-3 border-2 border-pencil bg-white px-4 py-3 text-left shadow-sketch-subtle wobbly-sm disabled:opacity-50 disabled:shadow-none"
              >
                <FileUp size={20} strokeWidth={2} className="shrink-0 text-pen-blue" />
                <div>
                  <div className="font-bold text-pencil">Import Files</div>
                  <div className="text-xs text-pencil/50">
                    Select one or more .md files
                  </div>
                </div>
              </button>

              <button
                onClick={() => folderRef.current?.click()}
                disabled={!canImport}
                className="btn-sketch flex w-full items-center gap-3 border-2 border-pencil bg-white px-4 py-3 text-left shadow-sketch-subtle wobbly-sm disabled:opacity-50 disabled:shadow-none"
              >
                <FolderUp size={20} strokeWidth={2} className="shrink-0 text-pen-blue" />
                <div>
                  <div className="font-bold text-pencil">Import Folder</div>
                  <div className="text-xs text-pencil/50">
                    Select a folder (subfolders become nested folders)
                  </div>
                </div>
              </button>
            </div>
          )}

          {progress.phase === "running" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-pencil">
                <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-pen-blue" />
                Importing…
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden border-2 border-pencil bg-white">
                <div
                  className="h-full bg-pen-blue transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-pencil/60">
                <span>
                  {progress.done} / {progress.total}
                </span>
                <span>{Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%</span>
              </div>

              <div className="truncate text-xs text-pencil/40" title={progress.current}>
                {progress.current || "Reading file…"}
              </div>

              <button
                onClick={handleCancel}
                className="btn-sketch w-full border-2 border-pencil bg-white py-2 text-sm text-pencil shadow-sketch-subtle wobbly-sm"
              >
                Cancel
              </button>
            </div>
          )}

          {progress.phase === "done" && (
            <div className="space-y-4 text-center">
              <CheckCircle size={40} strokeWidth={1.5} className="mx-auto text-green-600" />
              <div>
                <p className="font-bold text-pencil">Import complete!</p>
                <p className="mt-1 text-sm text-pencil/60">
                  {progress.done} / {progress.total} imported
                </p>
              </div>
              <button
                onClick={onClose}
                className="btn-sketch w-full border-2 border-pencil bg-white py-2 text-sm text-pencil shadow-sketch-subtle wobbly-sm"
              >
                Done
              </button>
            </div>
          )}

          {progress.phase === "error" && (
            <div className="space-y-4 text-center">
              <AlertCircle size={40} strokeWidth={1.5} className="mx-auto text-accent" />
              <div>
                <p className="font-bold text-pencil">Import failed</p>
                <p className="mt-1 text-sm text-pencil/60">{progress.error}</p>
              </div>
              <button
                onClick={() => setProgress({ total: 0, done: 0, current: "", phase: "idle" })}
                className="btn-sketch w-full border-2 border-pencil bg-white py-2 text-sm text-pencil shadow-sketch-subtle wobbly-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={singleFileRef}
          type="file"
          accept=".md,text/markdown"
          multiple
          className="hidden"
          onChange={(e) => {
            handleSingleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderRef}
          type="file"
          // @ts-expect-error webkitdirectory is a non-standard WebKit attribute
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => {
            handleFolder(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
