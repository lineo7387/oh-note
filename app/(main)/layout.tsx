import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import FolderTreeServer from "@/components/folder-tree/folder-tree-server";
import MobileShell from "@/components/layout/mobile-shell";

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
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <MobileShell folderTree={<FolderTreeServer userId={session.user.id} />}>
      {children}
    </MobileShell>
  );
}
