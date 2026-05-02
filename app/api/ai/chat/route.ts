import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchSimilarNotes } from "@/lib/embedding";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages, noteContext } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 }
      );
    }

    // Retrieve relevant notes from knowledge base using the last user message
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m: { role: string }) => m.role === "user");

    let knowledgeBaseContext = "";
    let sourceNotes: { id: string; title: string }[] = [];

    if (lastUserMessage?.content) {
      try {
        const results = await searchSimilarNotes(
          lastUserMessage.content,
          session.user.id,
          3
        );
        if (results.length > 0) {
          sourceNotes = results.map((r) => ({ id: r.noteId, title: r.title }));
          knowledgeBaseContext =
            "The following notes from the user's knowledge base may be relevant:\n\n" +
            results
              .map(
                (r, i) =>
                  `--- Note ${i + 1}: ${r.title} ---\n${r.textSnapshot}`
              )
              .join("\n\n");
        }
      } catch {
        // Knowledge base search failure should not block the chat
      }
    }

    const parts: string[] = [
      "You are a helpful AI assistant embedded in a note-taking app.",
    ];

    if (noteContext) {
      parts.push(
        `The user is currently working on a note with the following content:\n\n---\n${noteContext}\n---`
      );
    }

    if (knowledgeBaseContext) {
      parts.push(knowledgeBaseContext);
    }

    parts.push(
      "Use the provided context when answering. If the context doesn't contain relevant information, answer based on your general knowledge. Be concise and helpful."
    );

    const systemPrompt = parts.join("\n\n");

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const apiResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return NextResponse.json(
        { error: `DeepSeek API error: ${errorText}` },
        { status: apiResponse.status }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = apiResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Source-Notes": sourceNotes.length > 0
          ? encodeURIComponent(JSON.stringify(sourceNotes))
          : "",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
