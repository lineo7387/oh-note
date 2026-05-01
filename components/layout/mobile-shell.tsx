"use client";

import { Suspense } from "react";
import { Menu, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import NoteList from "@/components/note-list/note-list";
import AiSidebar from "@/components/ai-sidebar/ai-sidebar";
import { SkeletonFolder } from "@/components/ui/skeleton";

function FolderTreeFallback() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-xl font-bold text-pencil" style={{ fontFamily: "var(--font-heading)" }}>
          Folders
        </h2>
        <div className="h-8 w-8 animate-pulse rounded bg-pencil/20" />
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-4">
        <SkeletonFolder count={8} />
      </div>
    </div>
  );
}

interface MobileShellProps {
  folderTree: React.ReactNode;
  children: React.ReactNode;
}

export default function MobileShell({ folderTree, children }: MobileShellProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-paper md:min-w-[768px]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left sidebar: drawer on mobile, inline on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex h-full w-[280px] flex-col border-r-2 border-pencil bg-paper
          transition-transform duration-300 ease-out
          -translate-x-full md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : ""}
        `}
      >
        {/* Mobile drawer header */}
        <div className="flex items-center justify-between border-b-2 border-pencil px-3 py-2 md:hidden">
          <span
            className="text-lg font-bold text-pencil"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            oh-note
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center text-pencil"
            aria-label="Close sidebar"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden border-b-2 border-dashed border-pencil/20">
          <Suspense fallback={<FolderTreeFallback />}>
            {folderTree}
          </Suspense>
        </div>
        <div className="h-[40%] overflow-hidden">
          <NoteList />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b-2 border-pencil bg-paper px-3 py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-sketch flex h-10 w-10 items-center justify-center border-2 border-pencil bg-white"
            aria-label="Open sidebar"
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <span
            className="text-lg font-bold text-pencil"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            oh-note
          </span>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>

      {/* AI Sidebar */}
      <AiSidebar />
    </div>
  );
}
