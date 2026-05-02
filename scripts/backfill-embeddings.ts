import { prisma } from "../lib/prisma";
import { generateEmbedding } from "../lib/embedding";

const BATCH_SIZE = 10;
const DELAY_MS = 500; // Delay between batches to avoid rate limits

async function backfill() {
  console.log("Starting embedding backfill...");

  // Find all notes without an embedding
  const notesWithoutEmbedding = await prisma.note.findMany({
    where: {
      embedding: null,
    },
    select: {
      id: true,
      userId: true,
      title: true,
      content: true,
    },
  });

  console.log(`Found ${notesWithoutEmbedding.length} notes without embeddings`);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < notesWithoutEmbedding.length; i += BATCH_SIZE) {
    const batch = notesWithoutEmbedding.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(notesWithoutEmbedding.length / BATCH_SIZE)} (${batch.length} notes)`
    );

    for (const note of batch) {
      try {
        const text = extractTextForEmbedding(note.title, note.content);
        const embedding = await generateEmbedding(text);

        // Delete old embedding if exists (shouldn't happen, but safety)
        await prisma.noteEmbedding.deleteMany({
          where: { noteId: note.id },
        });

        // Insert via raw query
        const vectorLiteral = `[${embedding.join(",")}]`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "NoteEmbedding" ("id", "noteId", "userId", "embedding", "textSnapshot", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, NOW())`,
          note.id,
          note.userId,
          vectorLiteral,
          text.slice(0, 4000)
        );

        processed++;
        console.log(`  ✓ ${note.title.slice(0, 40)}`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${note.title.slice(0, 40)} —`, err);
      }
    }

    if (i + BATCH_SIZE < notesWithoutEmbedding.length) {
      console.log(`Waiting ${DELAY_MS}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log("\nBackfill complete!");
  console.log(`  Processed: ${processed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${notesWithoutEmbedding.length}`);

  await prisma.$disconnect();
}

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

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
