import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "DeepSeek API key not configured" }, { status: 500 });
    }

    const firstUser = messages.find((m) => m.role === "user");
    const firstAssistant = messages.find((m) => m.role === "assistant");

    const prompt = `Generate a very short title (max 24 characters, Chinese or English) for the following conversation. Only return the title, nothing else.

User: ${firstUser?.content?.slice(0, 200) || ""}
Assistant: ${firstAssistant?.content?.slice(0, 200) || ""}`;

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 20,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `DeepSeek API error: ${errorText}` }, { status: res.status });
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };

    const title = data.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "Untitled";
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
  }
}
