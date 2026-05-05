import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toolSchemas, executeTool, SourceNote } from "@/lib/ai-tools";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

const MAX_TOOL_ROUNDS = 4;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages, noteContext } = (await request.json()) as {
      messages: ChatMessage[];
      noteContext?: string;
    };

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

    // Build system prompt
    const parts: string[] = [
      "You are a helpful AI assistant embedded in a note-taking app. You are powered by DeepSeek (deepseek-v4-pro).",
      "You have access to tools that let you query the user's notes.",
      "Use the tools based on what the user is asking:",
      '- search_notes_semantic: use for questions about content, concepts, topics, or ideas within notes ("what does X say?", "how does Y work?")',
      '- get_folder_tree: use when the user mentions a folder name and you need to resolve it, or when asking about structure',
      '- list_notes_in_folder: use when the user asks to list or enumerate notes in a folder',
      '- count_notes: use when the user asks "how many notes", counts, or totals',
      "Be concise and helpful. Use the folderPath field in results to provide context about where notes are located.",
    ];

    if (noteContext) {
      parts.push(
        `The user is currently working on a note with the following content:\n\n---\n${noteContext}\n---`
      );
    }

    const systemPrompt = parts.join("\n\n");

    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Tool-calling loop
    const allSources: SourceNote[] = [];
    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
      round++;

      const res = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-v4-pro",
            messages: apiMessages,
            tools: toolSchemas,
            stream: false,
          }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json(
          { error: `DeepSeek API error: ${errorText}` },
          { status: res.status }
        );
      }

      const data = (await res.json()) as {
        choices: { message: ChatMessage }[];
      };

      const message = data.choices[0]?.message;
      if (!message) {
        return NextResponse.json(
          { error: "Empty response from DeepSeek" },
          { status: 500 }
        );

      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        // Execute tools
        apiMessages.push(message);

        for (const call of message.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            // malformed args
          }

          const { result, sources } = await executeTool(
            call.function.name,
            args,
            session.user.id
          );

          for (const s of sources) {
            if (!allSources.some((x) => x.id === s.id)) {
              allSources.push(s);
            }
          }

          apiMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        }

        continue;
      }

      // No tool calls — stream the final response
      break;
    }

    // If we hit max rounds, force a final call without tools
    if (round >= MAX_TOOL_ROUNDS) {
      const res = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-v4-pro",
            messages: apiMessages,
            stream: false,
          }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json(
          { error: `DeepSeek API error: ${errorText}` },
          { status: res.status }
        );
      }

      const data = (await res.json()) as {
        choices: { message: ChatMessage }[];
      };
      const content = data.choices[0]?.message?.content || "";

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const lines = content.split("");
          for (const char of lines) {
            const payload = JSON.stringify({
              choices: [{ delta: { content: char } }],
            });
            controller.enqueue(
              encoder.encode(`data: ${payload}\n\n`)
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Source-Notes":
            allSources.length > 0
              ? encodeURIComponent(JSON.stringify(allSources))
              : "",
        },
      });
    }

    // Stream final response
    const apiResponse = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
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
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return NextResponse.json(
        { error: `DeepSeek API error: ${errorText}` },
        { status: apiResponse.status }
      );
    }

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
        "X-Source-Notes":
          allSources.length > 0
            ? encodeURIComponent(JSON.stringify(allSources))
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
