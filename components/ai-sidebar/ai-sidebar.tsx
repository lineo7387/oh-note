"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Search,
  BookOpen,
  Unlink,
  Check,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { extractTextFromBlocks } from "@/components/editor/editor";
import {
  type ChatMessage,
  type ConversationMeta,
  listConversations,
  getConversationData,
  createConversation,
  updateConversationMeta,
  updateConversationData,
  deleteConversation,
  getCurrentConversationId,
  setCurrentConversationId,
  getSidebarWidth,
  setSidebarWidth as saveSidebarWidth,
} from "@/lib/conversations-db";
import ConversationTabs from "./conversation-tabs";
import ResizeHandle from "./resize-handle";
import ThinkingIndicator from "./thinking-indicator";

interface SourceNote {
  id: string;
  title: string;
}

interface ContextNote {
  id: string;
  title: string;
  content: string;
}

export default function AiSidebar() {
  const [open, setOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Context: selected notes + auto-follow flag
  const [contextNotes, setContextNotes] = useState<ContextNote[]>([]);
  const [autoFollow, setAutoFollow] = useState(true);

  // Note selector
  const [showSelector, setShowSelector] = useState(false);
  const [allNotes, setAllNotes] = useState<{ id: string; title: string }[]>([]);
  const [noteSearch, setNoteSearch] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadError, setLoadError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const selectorRef = useRef<HTMLDivElement>(null);
  const latestMessagesRef = useRef<ChatMessage[]>([]);

  // Keep latestMessagesRef in sync
  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  // ── Init ──
  useEffect(() => {
    async function init() {
      const savedOpen = localStorage.getItem("oh-note-ai-open");
      if (savedOpen) setOpen(savedOpen === "true");

      const savedWidth = await getSidebarWidth();
      if (savedWidth) setSidebarWidth(savedWidth);

      let convs = await listConversations();
      if (convs.length === 0) {
        const c = await createConversation();
        convs = [c];
      }
      setConversations(convs);

      let currentId = await getCurrentConversationId();
      if (!currentId || !convs.some((c) => c.id === currentId)) {
        currentId = convs[0].id;
        await setCurrentConversationId(currentId);
      }
      setActiveConversationId(currentId);

      const data = await getConversationData(currentId);
      if (data) {
        setMessages(data.messages);
        setAutoFollow(data.autoFollow);
        if (data.contextNoteIds.length > 0) {
          const notes = await Promise.all(
            data.contextNoteIds.map((id) => fetchNoteContent(id))
          );
          setContextNotes(notes.filter(Boolean) as ContextNote[]);
        }
      }
    }
    init();
  }, []);

  // Save open state
  useEffect(() => {
    localStorage.setItem("oh-note-ai-open", String(open));
  }, [open]);

  // Fetch note content by ID
  const fetchNoteContent = useCallback(async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const note = await res.json();
      const text = extractTextFromBlocks(note.content);
      const title = note.title || "Untitled";
      return {
        id: noteId,
        title,
        content: text
          ? `Title: ${title}\n\n${text}`
          : `Title: ${title}\n\n(Empty note)`,
      };
    } catch (err) {
      console.error("fetchNoteContent failed:", err);
      return null;
    }
  }, []);

  // Handle pathname changes
  useEffect(() => {
    async function syncContext() {
      if (!autoFollow || !activeConversationId) return;

      const match = pathname.match(/^\/note\/(.+)$/);
      if (!match) {
        if (autoFollow) setContextNotes([]);
        return;
      }

      const noteId = match[1];
      if (contextNotes.some((n) => n.id === noteId)) return;

      const note = await fetchNoteContent(noteId);
      if (note) {
        setContextNotes([note]);
      }
    }
    syncContext();
  }, [pathname, autoFollow, activeConversationId, fetchNoteContent]);

  // Persist context-note IDs when they change
  useEffect(() => {
    if (!activeConversationId) return;
    updateConversationData(activeConversationId, {
      contextNoteIds: contextNotes.map((n) => n.id),
      autoFollow,
    });
  }, [contextNotes, autoFollow, activeConversationId]);

  // Load all notes for selector
  const loadAllNotes = useCallback(async () => {
    setLoadingNotes(true);
    setLoadError("");
    try {
      const res = await fetch("/api/notes/all");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const notes = await res.json();
      if (!Array.isArray(notes)) {
        throw new Error("Invalid response format");
      }
      setAllNotes(notes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load notes";
      setLoadError(msg);
      console.error("loadAllNotes failed:", err);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  // Open selector
  const openSelector = useCallback(() => {
    setShowSelector(true);
    setNoteSearch("");
    setLoadError("");
    loadAllNotes();
  }, [loadAllNotes]);

  // Toggle note selection in selector
  const toggleNoteSelection = useCallback(
    async (noteId: string) => {
      setContextNotes((prev) => {
        const exists = prev.some((n) => n.id === noteId);
        if (exists) {
          return prev.filter((n) => n.id !== noteId);
        }
        fetchNoteContent(noteId).then((note) => {
          if (note) {
            setContextNotes((current) => {
              if (current.some((n) => n.id === noteId)) return current;
              return [...current, note];
            });
          }
        });
        return prev;
      });
      setAutoFollow(false);
    },
    [fetchNoteContent]
  );

  // Remove a single context note
  const removeContextNote = useCallback((noteId: string) => {
    setContextNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // Clear all context
  const clearAllContext = useCallback(() => {
    setContextNotes([]);
    setAutoFollow(false);
    setShowSelector(false);
  }, []);

  // Resume following current note
  const followCurrent = useCallback(() => {
    setContextNotes([]);
    setAutoFollow(true);
    setShowSelector(false);
  }, []);

  // Close selector
  const closeSelector = useCallback(() => {
    setShowSelector(false);
  }, []);

  // Click outside to close selector
  useEffect(() => {
    if (!showSelector) return;
    const handler = (e: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(e.target as Node)
      ) {
        setShowSelector(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSelector]);

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

  // Escape to close sidebar or selector
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        if (showSelector) {
          setShowSelector(false);
        } else {
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, showSelector]);

  // Filtered notes for selector
  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return allNotes;
    const q = noteSearch.toLowerCase();
    return allNotes.filter((n) => n.title.toLowerCase().includes(q));
  }, [allNotes, noteSearch]);

  // Build noteContext string for API
  const noteContext = useMemo(() => {
    if (contextNotes.length === 0) return "";
    return contextNotes.map((n) => n.content).join("\n\n---\n\n");
  }, [contextNotes]);

  // Title generation
  const generateTitle = useCallback(
    async (conversationId: string, msgs: ChatMessage[]) => {
      try {
        const res = await fetch("/api/ai/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgs.slice(0, 4) }),
        });
        if (!res.ok) return;
        const { title } = (await res.json()) as { title: string };
        await updateConversationMeta(conversationId, { title });
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title } : c))
        );
      } catch {
        // best effort
      }
    },
    []
  );

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !activeConversationId) return;
    const conversationId = activeConversationId;

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

    const startMessages = [...latestMessagesRef.current, userMsg, assistantMsg];
    setMessages(startMessages);
    latestMessagesRef.current = startMessages;
    setInput("");
    setLoading(true);

    const history = startMessages.map((m) => ({
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
      let currentMessages = startMessages;

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
              currentMessages = currentMessages.map((m, i) => {
                if (i !== currentMessages.length - 1) return m;
                return { ...m, content: m.content + delta };
              });
              setMessages(currentMessages);
              latestMessagesRef.current = currentMessages;
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }

      // Finish streaming
      const finalMessages = currentMessages.map((m, i) => {
        if (i !== currentMessages.length - 1) return m;
        return {
          ...m,
          streaming: false,
          sources: sourceNotes.length > 0 ? sourceNotes : undefined,
        };
      });
      setMessages(finalMessages);
      latestMessagesRef.current = finalMessages;

      // Save to conversation
      await updateConversationData(conversationId, { messages: finalMessages });

      // Title generation on first assistant response
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation && !conversation.title) {
        const assistantCount = finalMessages.filter(
          (m) => m.role === "assistant" && !m.streaming
        ).length;
        if (assistantCount === 1) {
          generateTitle(conversationId, finalMessages);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorMessages = latestMessagesRef.current.map((m, i) => {
          if (i !== latestMessagesRef.current.length - 1) return m;
          return {
            ...m,
            content: "Sorry, something went wrong. Please try again.",
            streaming: false,
          };
        });
        setMessages(errorMessages);
        latestMessagesRef.current = errorMessages;
        await updateConversationData(conversationId, { messages: errorMessages });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, activeConversationId, noteContext, conversations, generateTitle]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Is a note currently selected in the selector
  const isNoteSelected = useCallback(
    (noteId: string) => contextNotes.some((n) => n.id === noteId),
    [contextNotes]
  );

  // ── Conversation management ──
  const handleCreateConversation = useCallback(async () => {
    const c = await createConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveConversationId(c.id);
    await setCurrentConversationId(c.id);
    setMessages([]);
    setContextNotes([]);
    setAutoFollow(true);
  }, []);

  const handleSwitchConversation = useCallback(
    async (id: string) => {
      if (id === activeConversationId) return;

      // Save current
      if (activeConversationId) {
        await updateConversationData(activeConversationId, {
          messages: latestMessagesRef.current,
          contextNoteIds: contextNotes.map((n) => n.id),
          autoFollow,
        });
      }

      // Load new
      setActiveConversationId(id);
      await setCurrentConversationId(id);
      const data = await getConversationData(id);
      if (data) {
        setMessages(data.messages);
        setAutoFollow(data.autoFollow);
        if (data.contextNoteIds.length > 0) {
          const notes = await Promise.all(
            data.contextNoteIds.map((nid) => fetchNoteContent(nid))
          );
          setContextNotes(notes.filter(Boolean) as ContextNote[]);
        } else {
          setContextNotes([]);
        }
      } else {
        setMessages([]);
        setContextNotes([]);
        setAutoFollow(true);
      }
    },
    [activeConversationId, contextNotes, autoFollow, fetchNoteContent]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      const remaining = await listConversations();
      setConversations(remaining);

      if (id === activeConversationId) {
        if (remaining.length > 0) {
          const nextId = remaining[0].id;
          setActiveConversationId(nextId);
          await setCurrentConversationId(nextId);
          const data = await getConversationData(nextId);
          if (data) {
            setMessages(data.messages);
            setAutoFollow(data.autoFollow);
            if (data.contextNoteIds.length > 0) {
              const notes = await Promise.all(
                data.contextNoteIds.map((nid) => fetchNoteContent(nid))
              );
              setContextNotes(notes.filter(Boolean) as ContextNote[]);
            } else {
              setContextNotes([]);
            }
          }
        } else {
          const c = await createConversation();
          setConversations([c]);
          setActiveConversationId(c.id);
          await setCurrentConversationId(c.id);
          setMessages([]);
          setContextNotes([]);
          setAutoFollow(true);
        }
      }
    },
    [activeConversationId, fetchNoteContent]
  );

  const handleResize = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  const handleResizeEnd = useCallback(() => {
    saveSidebarWidth(sidebarWidth);
  }, [sidebarWidth]);

  // Handle resize end via effect
  useEffect(() => {
    const handleMouseUp = () => handleResizeEnd();
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleResizeEnd]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center border-[3px] border-pencil bg-white text-pencil shadow-sketch wobbly btn-sketch"
      >
        <MessageCircle size={24} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 z-50 flex h-full flex-col border-l-2 border-pencil bg-paper shadow-[-8px_0_24px_0_rgba(0,0,0,0.12)] lg:static lg:z-auto lg:shadow-[-4px_0_0_0_#2d2d2d]"
      style={{ width: sidebarWidth }}
    >
      <ResizeHandle
        onResize={handleResize}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-pencil/20 px-4 py-3">
        <div className="flex items-center gap-2">
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

      {/* Conversation tabs */}
      <ConversationTabs
        conversations={conversations}
        activeId={activeConversationId}
        onSwitch={handleSwitchConversation}
        onCreate={handleCreateConversation}
        onDelete={handleDeleteConversation}
      />

      {/* Context control bar */}
      <div className="relative border-b border-dashed border-pencil/20 px-3 py-2">
        {contextNotes.length === 0 ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-pencil/40">
              {autoFollow
                ? "Following current note"
                : "No context (knowledge base mode)"}
            </span>
            <div className="flex items-center gap-1">
              {!autoFollow && (
                <button
                  onClick={followCurrent}
                  className="flex items-center gap-1 rounded border border-pencil/20 bg-white px-2 py-0.5 text-xs text-pencil/60 hover:border-pen-blue hover:text-pen-blue"
                >
                  <BookOpen size={12} />
                  Follow
                </button>
              )}
              <button
                onClick={openSelector}
                className="flex items-center gap-1 rounded border border-pencil/20 bg-white px-2 py-0.5 text-xs text-pencil/60 hover:border-pen-blue hover:text-pen-blue"
              >
                <Search size={12} />
                Pick
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1">
              {contextNotes.map((note) => (
                <span
                  key={note.id}
                  className="inline-flex items-center gap-1 rounded border border-pencil/20 bg-white px-2 py-0.5 text-xs text-pencil/70"
                >
                  <BookOpen size={10} className="text-pen-blue" />
                  <span className="truncate max-w-[140px]">{note.title}</span>
                  <button
                    onClick={() => removeContextNote(note.id)}
                    className="ml-0.5 text-pencil/40 hover:text-accent"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              {!autoFollow && contextNotes.length > 0 && (
                <span className="inline-flex items-center rounded bg-pen-blue/10 px-1.5 py-0.5 text-[10px] text-pen-blue">
                  pinned
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!autoFollow && (
                <button
                  onClick={followCurrent}
                  className="flex items-center gap-1 rounded border border-pencil/20 bg-white px-2 py-0.5 text-xs text-pencil/60 hover:border-pen-blue hover:text-pen-blue"
                >
                  <Unlink size={12} />
                  Follow current
                </button>
              )}
              <button
                onClick={openSelector}
                className="flex items-center gap-1 rounded border border-pencil/20 bg-white px-2 py-0.5 text-xs text-pencil/60 hover:border-pen-blue hover:text-pen-blue"
              >
                <Search size={12} />
                {contextNotes.length > 0 ? "Add more" : "Pick"}
              </button>
              <button
                onClick={clearAllContext}
                className="flex h-5 w-5 items-center justify-center rounded text-pencil/40 hover:text-accent"
                title="Clear all"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* Note selector dropdown */}
        {showSelector && (
          <div
            ref={selectorRef}
            className="absolute left-2 right-2 top-full z-10 mt-1 border-2 border-pencil bg-paper shadow-sketch"
          >
            {/* Search */}
            <div className="border-b border-dashed border-pencil/20 p-2">
              <div className="flex items-center gap-1.5 border-2 border-pencil bg-white px-2 py-1">
                <Search size={12} className="text-pencil/40" />
                <input
                  type="text"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="flex-1 bg-transparent text-xs text-pencil outline-none placeholder:text-pencil/30"
                  autoFocus
                />
                {noteSearch && (
                  <button
                    onClick={() => setNoteSearch("")}
                    className="text-pencil/40 hover:text-accent"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Note list */}
            <div className="max-h-[220px] overflow-y-auto">
              {loadingNotes ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-pencil/40">
                  <Loader2 size={14} className="animate-spin" />
                  Loading notes...
                </div>
              ) : loadError ? (
                <div className="px-3 py-3 text-center">
                  <p className="text-xs text-accent">{loadError}</p>
                  <button
                    onClick={loadAllNotes}
                    className="mt-1 text-xs text-pen-blue hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="py-4 text-center text-xs text-pencil/40">
                  {noteSearch ? "No notes found" : "No notes"}
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const selected = isNoteSelected(note.id);
                  return (
                    <button
                      key={note.id}
                      onClick={() => toggleNoteSelection(note.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-pencil/5 ${
                        selected
                          ? "bg-pen-blue/5 text-pen-blue"
                          : "text-pencil/70"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 ${
                          selected
                            ? "border-pen-blue bg-pen-blue text-white"
                            : "border-pencil/30"
                        }`}
                      >
                        {selected && <Check size={10} strokeWidth={3} />}
                      </div>
                      <BookOpen size={12} className="shrink-0" />
                      <span className="truncate">{note.title || "Untitled"}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-dashed border-pencil/20 px-3 py-1.5">
              <span className="text-[10px] text-pencil/40">
                {contextNotes.length > 0
                  ? `${contextNotes.length} selected`
                  : "Click to select"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearAllContext}
                  className="px-2 py-0.5 text-xs text-pencil/50 hover:text-accent"
                >
                  Clear
                </button>
                <button
                  onClick={closeSelector}
                  className="rounded border border-pencil/20 bg-white px-2 py-0.5 text-xs text-pencil hover:border-pen-blue hover:text-pen-blue"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-pencil/40">
            <Bot size={40} strokeWidth={1.5} className="mb-2" />
            <p className="text-sm">
              Ask me anything about your notes!
            </p>
            <p className="mt-1 text-xs text-pencil/30">
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
                msg.role === "user"
                  ? "bg-pen-blue text-white"
                  : "bg-white text-pencil"
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
                <div className="whitespace-pre-wrap">
                  {msg.content}
                  {msg.streaming && (
                    <span className="ml-1 inline-block h-3 w-3 animate-pulse rounded-full bg-pen-blue" />
                  )}
                </div>
              </div>
              {msg.role === "assistant" &&
                msg.sources &&
                msg.sources.length > 0 && (
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
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <ThinkingIndicator />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t-2 border-dashed border-pencil/20 p-3">
        <div className="flex items-end gap-2">
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
  );
}
