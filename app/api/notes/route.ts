import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  if (!folderId) {
    return NextResponse.json(
      { error: "folderId query parameter is required" },
      { status: 400 }
    );
  }

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: session.user.id },
  });

  if (!folder) {
    return NextResponse.json(
      { error: "Folder not found" },
      { status: 404 }
    );
  }

  const notes = await prisma.note.findMany({
    where: { folderId, userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      folderId: true,
      userId: true,
    },
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, folderId, content } = await request.json();

    if (!folderId || typeof folderId !== "string") {
      return NextResponse.json(
        { error: "folderId is required" },
        { status: 400 }
      );
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: session.user.id },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    const note = await prisma.note.create({
      data: {
        title: title?.trim() || "Untitled",
        content: content || [],
        userId: session.user.id,
        folderId,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
