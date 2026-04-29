import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { folderId } = await request.json();

    if (!folderId || typeof folderId !== "string") {
      return NextResponse.json(
        { error: "folderId is required" },
        { status: 400 }
      );
    }

    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: session.user.id },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Target folder not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { folderId },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to move note" },
      { status: 500 }
    );
  }
}
