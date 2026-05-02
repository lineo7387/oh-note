"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { extractTextFromBlocks } from "@/components/editor/editor";

interface SourceNote {
  id: string;
  title: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  sources?: SourceNote[];
}

export default function AiSidebar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [noteContext, setNoteContext] = useState("");
  const { error: toastError } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pathname = usePathname();

  // Load open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("oh-note-ai-open");
    if (saved) setOpen(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("oh-note-ai-open", String(open));
  }, [open]);

  // Extract note context when on a note page
  useEffect(() => {
    async function loadContext() {
      const match = pathname.match(/^\/note\/(.+)$/);
      if (!match) {
        setNoteContext("");
        return;
      }
      const noteId = match[1];
      try {
        const res = await fetch(`/api/notes/${noteId}`);
        if (res.ok) {
          const note = await res.json();
          const text = extractTextFromBlocks(note.content);
          const title = note.title || "Untitled";
          setNoteContext(text ? `Title: ${title}\n\n${text}` : `Title: ${title}\n\n(Empty note)`);
        } else {
          toastError("Failed to load note context for AI");
        }
      } catch {
        toastError("Failed to load note context for AI");
        setNoteContext("");
      }
    }
    loadContext();
  }, [pathname]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, noteContext }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get response");
      }

      // Parse source notes from response headers
      let sourceNotes: SourceNote[] = [];
      const sourceNotesHeader = res.headers.get("X-Source-Notes");
      if (sourceNotesHeader) {
        try {
          sourceNotes = JSON.parse(decodeURIComponent(sourceNotesHeader));
        } catch {
          // ignore malformed header
        }
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role !== "assistant") return prev;
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + delta,
                };
                return updated;
              });
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }

      // Finish streaming
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role !== "assistant") return prev;
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          streaming: false,
          sources: sourceNotes.length > 0 ? sourceNotes : undefined,
        };
        return updated;
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role !== "assistant") return prev;
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            content: "Sorry, something went wrong. Please try again.",
            streaming: false,
          };
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages, noteContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center border-[3px] border-pencil bg-white text-pencil shadow-sketch wobbly btn-sketch"
        >
          <MessageCircle size={24} strokeWidth={2.5} />
        </button>
      )}

      {/* Sidebar panel */}
      {open && (
        <div className="fixed right-0 top-0 z-50 flex h-full w-[320px] flex-col border-l-2 border-pencil bg-paper shadow-[-8px_0_24px_0_rgba(0,0,0,0.12)] lg:static lg:z-auto lg:shadow-[-4px_0_0_0_#2d2d2d]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-dashed border-pencil/20 px-4 py-3"
          >
            <div className="flex items-center gap-2"
            >
              <Bot size={20} strokeWidth={2.5} className="text-pen-blue" />
              <h3
                className="text-lg font-bold text-pencil"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                AI Assistant
              </h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center text-pencil/60 hover:text-accent"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Context indicator */}
          {noteContext && (
            <div className="mx-3 mt-2 border border-dashed border-pencil/20 bg-white/50 px-2 py-1 text-xs text-pencil/50 truncate"
            >
              Context: {noteContext.split("\n")[0]?.replace("Title: ", "") || "Current note"}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-pencil/40"
              >
                <Bot size={40} strokeWidth={1.5} className="mb-2" />
                <p className="text-sm"
                >
                  Ask me anything about your notes!
                </p>
                <p className="mt-1 text-xs text-pencil/30"
                >
                  I can search across your entire knowledge base
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-pencil ${
                    msg.role === "user" ? "bg-pen-blue text-white" : "bg-white text-pencil"
                  } wobbly-sm`}
                >
                  {msg.role === "user" ? (
                    <User size={14} strokeWidth={2.5} />
                  ) : (
                    <Bot size={14} strokeWidth={2.5} />
                  )}
                </div>
                <div className="flex max-w-[85%] flex-col gap-1">
                  <div
                    className={`border-2 px-3 py-2 text-sm shadow-sketch-subtle ${
                      msg.role === "user"
                        ? "border-pencil bg-pen-blue text-white wobbly-sm"
                        : "border-pencil bg-white text-pencil wobbly-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap"
                    >
                      {msg.content}
                      {msg.streaming && (
                        <span className="ml-1 inline-block h-3 w-3 animate-pulse rounded-full bg-pen-blue"
                        />
                      )}
                    </div>
                  </div>
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-1">
                      {msg.sources.map((source) => (
                        <a
                          key={source.id}
                          href={`/note/${source.id}`}
                          className="inline-flex items-center gap-1 rounded border border-pencil/20 bg-white px-2 py-0.5 text-xs text-pencil/60 hover:border-pen-blue hover:text-pen-blue"
                        >
                          <span className="truncate max-w-[180px]">{source.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t-2 border-dashed border-pencil/20 p-3"
          >
            <div className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something..."
                rows={1}
                className="input-sketch min-h-[40px] flex-1 resize-none border-2 border-pencil bg-white px-3 py-2 text-sm text-pencil outline-none wobbly-sm"
                style={{ fontFamily: "var(--font-body)" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className={`btn-sketch flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-pencil shadow-sketch wobbly-sm ${
                  input.trim() && !loading
                    ? "bg-white text-pencil"
                    : "bg-muted/50 text-pencil/30"
                }`}
              >
                {loading ? (
                  <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                ) : (
                  <Send size={16} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
