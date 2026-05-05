import { prisma } from "./prisma";
import { searchSimilarNotes } from "./embedding";

export interface SourceNote {
  id: string;
  title: string;
}

export const toolSchemas = [
  {
    type: "function" as const,
    function: {
      name: "search_notes_semantic",
      description:
        "Search the user's notes by semantic meaning. Use this when the user asks about content, concepts, topics, or ideas within their notes.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query describing what to find",
          },
          topK: {
            type: "number",
            description: "Maximum number of results to return (default 8, max 20)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_folder_tree",
      description:
        "Get the user's full folder hierarchy. Use this when the user mentions folder names and you need to resolve them to IDs, or when the user asks about the folder structure.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_notes_in_folder",
      description:
        "List notes within a specific folder. Use this when the user asks to list, enumerate, or find notes in a folder.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "The ID of the folder",
          },
          recursive: {
            type: "boolean",
            description: "Whether to include notes from descendant folders (default false)",
          },
        },
        required: ["folderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "count_notes",
      description:
        "Count notes. Use this when the user asks 'how many notes', counts, or totals.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "Optional: count only within this folder. If omitted, counts all notes for the user.",
          },
          recursive: {
            type: "boolean",
            description: "Whether to count notes in descendant folders too (default false)",
          },
        },
        required: [],
      },
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; sources: SourceNote[] }> {
  const sources: SourceNote[] = [];

  switch (name) {
    case "search_notes_semantic": {
      const query = String(args.query || "");
      const topK = Math.min(Math.max(1, Number(args.topK ?? 8)), 20);
      if (!query) {
        return { result: JSON.stringify({ notes: [] }), sources };
      }
      const notes = await searchSimilarNotes(query, userId, topK, 0.3);
      for (const n of notes) {
        sources.push({ id: n.noteId, title: n.title });
      }
      return {
        result: JSON.stringify({
          notes: notes.map((n) => ({
            noteId: n.noteId,
            title: n.title,
            folderPath: n.folderPath,
            snippet: n.textSnapshot.slice(0, 2000),
            similarity: n.similarity,
          })),
        }),
        sources,
      };
    }

    case "get_folder_tree": {
      const roots = await prisma.folder.findMany({
        where: { userId, parentId: null },
        select: { id: true, name: true },
      });
      const allFolders = await prisma.folder.findMany({
        where: { userId },
        select: { id: true, name: true, parentId: true },
      });
      const map = new Map<string, { id: string; name: string; children: typeof tree }>();
      for (const f of allFolders) {
        map.set(f.id, { id: f.id, name: f.name, children: [] });
      }
      const tree: { id: string; name: string; children: typeof tree }[] = [];
      for (const f of allFolders) {
        const node = map.get(f.id)!;
        if (f.parentId && map.has(f.parentId)) {
          map.get(f.parentId)!.children.push(node);
        } else if (!f.parentId) {
          tree.push(node);
        }
      }
      return { result: JSON.stringify({ folders: tree }), sources };
    }

    case "list_notes_in_folder": {
      const folderId = String(args.folderId || "");
      const recursive = Boolean(args.recursive ?? false);
      if (!folderId) {
        return { result: JSON.stringify({ error: "folder_not_found" }), sources };
      }
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
      });
      if (!folder) {
        return { result: JSON.stringify({ error: "folder_not_found" }), sources };
      }

      let folderIds: string[];
      if (recursive) {
        const allFolders = await prisma.folder.findMany({
          where: { userId },
          select: { id: true, parentId: true },
        });
        const descendants: string[] = [folderId];
        let changed = true;
        while (changed) {
          changed = false;
          for (const f of allFolders) {
            if (f.parentId && descendants.includes(f.parentId) && !descendants.includes(f.id)) {
              descendants.push(f.id);
              changed = true;
            }
          }
        }
        folderIds = descendants;
      } else {
        folderIds = [folderId];
      }

      const notes = await prisma.note.findMany({
        where: { userId, folderId: { in: folderIds } },
        select: { id: true, title: true, folder: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });

      for (const n of notes) {
        sources.push({ id: n.id, title: n.title });
      }

      return {
        result: JSON.stringify({
          notes: notes.map((n) => ({
            noteId: n.id,
            title: n.title,
            folderPath: n.folder.name,
          })),
        }),
        sources,
      };
    }

    case "count_notes": {
      const folderId = args.folderId ? String(args.folderId) : undefined;
      const recursive = Boolean(args.recursive ?? false);

      let count: number;
      if (!folderId) {
        count = await prisma.note.count({ where: { userId } });
      } else {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId },
        });
        if (!folder) {
          return { result: JSON.stringify({ error: "folder_not_found" }), sources };
        }

        if (!recursive) {
          count = await prisma.note.count({ where: { userId, folderId } });
        } else {
          const allFolders = await prisma.folder.findMany({
            where: { userId },
            select: { id: true, parentId: true },
          });
          const descendants: string[] = [folderId];
          let changed = true;
          while (changed) {
            changed = false;
            for (const f of allFolders) {
              if (f.parentId && descendants.includes(f.parentId) && !descendants.includes(f.id)) {
                descendants.push(f.id);
                changed = true;
              }
            }
          }
          count = await prisma.note.count({
            where: { userId, folderId: { in: descendants } },
          });
        }
      }

      return { result: JSON.stringify({ count }), sources };
    }

    default:
      return { result: JSON.stringify({ error: "unknown_tool" }), sources };
  }
}
