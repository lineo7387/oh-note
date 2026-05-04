import { prisma } from "./prisma";

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const EMBEDDING_API_BASE =
  process.env.SILICONFLOW_API_BASE || "https://api.siliconflow.cn/v1";
const EMBEDDING_MODEL = "BAAI/bge-m3";

export interface SearchResult {
  noteId: string;
  title: string;
  textSnapshot: string;
  similarity: number;
}

/**
 * Generate an embedding vector for the given text using SiliconFlow API.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!SILICONFLOW_API_KEY) {
    throw new Error("SILICONFLOW_API_KEY is not configured");
  }

  const response = await fetch(`${EMBEDDING_API_BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SiliconFlow embedding API error: ${error}`);
  }

  const data = (await response.json()) as {
    data: { embedding: number[] }[];
  };

  return data.data[0].embedding;
}

/**
 * Upsert the embedding for a note. Non-blocking errors.
 */
export async function upsertNoteEmbedding(
  noteId: string,
  userId: string,
  title: string,
  content: unknown
): Promise<void> {
  try {
    const text = extractTextForEmbedding(title, content);
    const embedding = await generateEmbedding(text);

    // Delete old embedding if exists
    await prisma.noteEmbedding.deleteMany({
      where: { noteId },
    });

    // Insert new embedding via raw query because Prisma doesn't support vector type
    const vectorLiteral = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "NoteEmbedding" ("id", "noteId", "userId", "embedding", "textSnapshot", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, NOW())`,
      noteId,
      userId,
      vectorLiteral,
      text.slice(0, 4000) // Store truncated text snapshot
    );
  } catch (err) {
    // Embedding failure must not block the note save
    console.error("Failed to upsert note embedding:", err);
  }
}

/**
 * Search for notes semantically similar to the query text.
 */
export async function searchSimilarNotes(
  queryText: string,
  userId: string,
  topK: number = 3
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(queryText);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<
    {
      noteId: string;
      title: string;
      textSnapshot: string;
      similarity: number;
    }[]
  >(
    `SELECT
      n."id" as "noteId",
      n."title",
      ne."textSnapshot",
      1 - (ne."embedding" <=> $1::vector) as "similarity"
     FROM "NoteEmbedding" ne
     JOIN "Note" n ON n."id" = ne."noteId"
     WHERE ne."userId" = $2
     ORDER BY ne."embedding" <=> $1::vector
     LIMIT $3`,
    vectorLiteral,
    userId,
    topK
  );

  return results.map((r) => ({
    noteId: r.noteId,
    title: r.title,
    textSnapshot: r.textSnapshot,
    similarity: Number(r.similarity),
  }));
}

/**
 * Extract plain text from note title + BlockNote content for embedding.
 */
function extractTextForEmbedding(title: string, content: unknown): string {
  const blocks = Array.isArray(content) ? content : [];
  const texts: string[] = [title];

  for (const block of blocks) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as Record<string, unknown>;

    if (b.type === "paragraph" || b.type === "heading") {
      const contentArr = b.content;
      if (Array.isArray(contentArr)) {
        for (const inline of contentArr) {
          if (typeof inline === "object" && inline !== null) {
            const text = (inline as Record<string, unknown>).text;
            if (typeof text === "string") texts.push(text);
          }
        }
      }
    }

    const children = b.children;
    if (Array.isArray(children)) {
      texts.push(extractChildrenText(children));
    }
  }

  return texts.join("\n").trim();
}

function extractChildrenText(children: unknown[]): string {
  const texts: string[] = [];
  for (const block of children) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as Record<string, unknown>;

    if (b.type === "paragraph" || b.type === "heading") {
      const contentArr = b.content;
      if (Array.isArray(contentArr)) {
        for (const inline of contentArr) {
          if (typeof inline === "object" && inline !== null) {
            const text = (inline as Record<string, unknown>).text;
            if (typeof text === "string") texts.push(text);
          }
        }
      }
    }

    const nested = b.children;
    if (Array.isArray(nested)) {
      texts.push(extractChildrenText(nested));
    }
  }
  return texts.join("\n");
}
