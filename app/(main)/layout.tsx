import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import FolderTreeServer from "@/components/folder-tree/folder-tree-server";
import NoteList from "@/components/note-list/note-list";
import AiSidebar from "@/components/ai-sidebar/ai-sidebar";
import { SkeletonFolder } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "oh-note",
  description: "AI-native note-taking app",
};

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

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      {/* Left column: Folder Tree + Note List */}
      <aside className="flex h-full w-[280px] shrink-0 flex-col border-r-2 border-pencil bg-paper">
        <div className="flex-1 overflow-hidden border-b-2 border-dashed border-pencil/20">
          <Suspense fallback={<FolderTreeFallback />}>
            <FolderTreeServer userId={session.user.id} />
          </Suspense>
        </div>
        <div className="h-[40%] overflow-hidden">
          <NoteList />
        </div>
      </aside>

      {/* Center: Editor */}
      <main className="flex flex-1 overflow-hidden">
        {children}
      </main>

      {/* Right: AI Sidebar (client component) */}
      <AiSidebar />
    </div>
  );
}
