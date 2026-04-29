import { prisma } from "@/lib/prisma";
import FolderTree from "./folder-tree";

export default async function FolderTreeServer({ userId }: { userId: string }) {
  const folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const serializedFolders = folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    userId: f.userId,
    createdAt: f.createdAt.toISOString(),
  }));

  return <FolderTree initialFolders={serializedFolders} />;
}
