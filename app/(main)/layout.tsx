import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import FolderTree from "@/components/folder-tree/folder-tree";
import NoteList from "@/components/note-list/note-list";
import AiSidebar from "@/components/ai-sidebar/ai-sidebar";

export const metadata: Metadata = {
  title: "oh-note",
  description: "AI-native note-taking app",
};

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      {/* Left column: Folder Tree + Note List */}
      <aside className="flex h-full w-[280px] shrink-0 flex-col border-r-2 border-pencil bg-paper">
        <div className="flex-1 overflow-hidden border-b-2 border-dashed border-pencil/20">
          <FolderTree />
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
