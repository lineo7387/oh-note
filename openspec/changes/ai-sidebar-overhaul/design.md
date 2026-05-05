## Context

The AI sidebar today is a single client component (`components/ai-sidebar/ai-sidebar.tsx`) holding chat state in `useState`, with retrieval handled entirely server-side: `app/api/ai/chat/route.ts` runs one vector search on the last user message, hardcoded to `topK=3`, and injects the snapshots into the system prompt before streaming. The panel is fixed at `w-[320px]`.

This works for short, semantic Q&A but breaks down on three axes:
- **Conversation lifecycle**: there is no "new conversation" affordance; everything accumulates in one transcript.
- **Question shape**: the model can only ever see 3 snippets, so questions like "how many notes are in folder X" or "list everything tagged with Y" silently degrade — the model answers from the 3 things it happened to see.
- **Reading ergonomics**: at 320px the panel cannot comfortably display longer answers, citation lists, or code blocks.

Constraints we want to honor:
- No Prisma schema changes (we want this to ship without a migration).
- No re-embedding of existing notes (current corpus could be sizeable; folder paths can be added at query time).
- Existing SSE streaming contract on `/api/ai/chat` should continue to work for the simple case (no tool used → straight stream).

Stakeholders: the primary user (single-user oh-note instance). The frontend is the only consumer of `/api/ai/chat`.

## Goals / Non-Goals

**Goals:**
- Let the user run multiple independent conversations in the sidebar, persisted across reloads.
- Let the AI answer aggregate / structural questions over the user's notes, not only semantic ones.
- Let the user widen the sidebar to a comfortable reading width and remember that choice.
- Keep the simple semantic-Q&A path fast (no extra round trip when no tool is needed).

**Non-Goals:**
- Cross-device conversation sync. History lives in IndexedDB on the device that produced it; opening the app in another browser starts fresh.
- Conversation search / global history view. Tabs are enough for now.
- Re-embedding the corpus to bake folder context into the vectors. We inject folder path at query time instead.
- Server-side rate limiting or quotas on tool calls. We trust the local user.
- Markdown rendering improvements or message editing — width fixes the immediate pain.

## Decisions

### D1. Tool calling replaces single-shot RAG injection

**Choice:** The chat endpoint runs a tool-calling loop. The model is given four tools and decides which to invoke (or none, if it can answer directly).

The four tools:
| Tool | Args | Purpose |
|---|---|---|
| `search_notes_semantic` | `query: string`, `topK?: number` (default 8, max 20) | Semantic vector search. Returns `{ noteId, title, folderPath, snippet, similarity }[]` filtered by `similarity >= 0.3`. |
| `get_folder_tree` | `()` | Full folder hierarchy as nested JSON. Used when the user asks structural questions referring to folder names. |
| `list_notes_in_folder` | `folderId: string`, `recursive?: boolean` (default false) | Returns `{ noteId, title, folderPath }[]` ordered by `updatedAt desc`. Capped at 200 to bound prompt size. |
| `count_notes` | `folderId?: string`, `recursive?: boolean` (default false) | Aggregate count. When `folderId` omitted, counts all notes for the user. |

System prompt explicitly tells the model: use semantic search for "what does X say" / "how does Y work" questions; use folder tools for "how many", "list", or any question that names a folder.

**Why over the alternative (raise topK + better prompt):** The aggregate question is fundamentally not a retrieval question — there is no semantic match for "how many", and even at topK=50 the model would have to count returned items, which it does badly and which doesn't generalize to "across all folders." Tools give the model a deterministic primitive.

**Alternative considered (single-tool: just `query_notes(intent)`):** rejected. A single overloaded tool means we either (a) push the routing logic into our server code, or (b) push it into a free-form intent string that the model has to design — both worse than letting the model pick from a small named menu it understands.

### D2. Streaming policy: stream from the final assistant turn only

**Choice:** The server runs the loop synchronously. While tools execute, nothing is streamed to the client (the client shows "thinking…"). Once the model produces its final assistant turn (no further tool calls), that turn is streamed via the existing SSE pipe. The client UI is unchanged for the simple case.

Loop termination: the loop runs at most `MAX_TOOL_ROUNDS = 4` rounds. If the model still wants a tool after round 4, we force a final answer by sending the conversation back without tools.

**Why:** Streaming intermediate tool-call deltas is doable but invasive — it would change the SSE contract and require a custom client parser. The user-visible benefit is small (most tool calls finish in <1s). A "thinking…" indicator preserves the existing client.

**Tradeoff:** First-token latency for tool-using questions goes up. Mitigated by the fact that simple questions (no tool) take the fast path unchanged.

### D3. Source attribution is derived from tool calls

**Choice:** The server tracks every note touched by `search_notes_semantic` and `list_notes_in_folder` during the loop. The union of `(noteId, title)` pairs is what gets sent back as `X-Source-Notes`. `count_notes` does not add sources (the count is the answer).

**Why:** Mirrors today's behavior — sources are "what the model actually saw" — but generalized to the tool-calling case.

### D4. Folder paths injected at query time, not at indexing time

**Choice:** `searchSimilarNotes` is updated to LEFT JOIN through `Folder` and walk the parent chain via a recursive CTE, returning a `folderPath` string ("Work / Projects / oh-note"). Vectors stay as-is.

**Why:** Re-embedding the entire corpus to include folder context is expensive and irreversible (we'd lose the textSnapshot). The folder path is small structured data that the model can use in its answer ("In folder *Work / Projects*, …") and as a citation hint, without changing the vector itself.

**Alternative considered (re-embed):** rejected. Cost > benefit when folder is already a queryable column.

### D5. Conversation history in IndexedDB, not Postgres

**Choice:** A new file `lib/conversations-db.ts` wraps `idb-keyval`. Schema:
- Key `conversations:index` → `Conversation[]` (ordered by `updatedAt desc`): `{ id, title, createdAt, updatedAt }`.
- Key `conversations:<id>` → `ConversationData`: `{ messages: ChatMessage[], contextNoteIds: string[], autoFollow: boolean }`.
- Key `ui:current-conversation-id` → `string`.
- Key `ui:sidebar-width` → `number`.

Conversations are per-device. Title generation is server-side via a new `/api/ai/title` endpoint that calls DeepSeek with a 1-shot prompt summarizing the first user/assistant exchange to ≤ 24 chars.

**Why:** Conversations are a UX nicety — the value of cross-device sync is low for a single-user app, the cost of a Prisma migration + write paths through the API is non-trivial, and IndexedDB is already the right tool for "lots of small client-owned objects." We can promote to server-side later if needed, with the same shape.

**Alternative considered (Postgres):** rejected for this iteration. Would require a `Conversation` and `ConversationMessage` table, RLS via `userId`, and API routes for CRUD. Out of scope for the immediate user complaint.

### D6. Conversation switching resets context-note selection

**Choice:** When the user switches conversations, the active context-note set and `autoFollow` flag come from the conversation record. New conversations start with `autoFollow: true` and an empty manual context list (so the current note from the URL becomes the implicit context, matching today's default).

**Why:** Treats each conversation as its own scope — the user explicitly asked for "重置" (reset) on switch. Surprising behavior would be to carry context across.

### D7. Horizontal tabs at the top, not a left rail

**Choice:** A horizontally scrollable tab strip at the top of the sidebar. Each tab shows the truncated title; the active tab is bold; hover reveals an `×` to delete. A trailing `+` button creates a new conversation.

**Why:** The sidebar is narrow even when widened. A vertical rail would steal horizontal space from the chat area; horizontal tabs reuse vertical space we already have above the message list.

**Tradeoff:** With many conversations the tab strip needs horizontal scroll. We accept that — most users will prune.

### D8. Resizable sidebar via left-edge drag handle

**Choice:** A 4-px-wide drag affordance on the left edge of the sidebar. `mousedown` starts a drag that updates `width = clamp(280, viewportRight - clientX, 720)`. On `mouseup`, the value is persisted to `localStorage` under `ui:sidebar-width`.

**Why:** Standard pattern, no library needed. The `[280, 720]` range covers "narrow but readable" through "comfortable for code blocks" without letting the user accidentally hide the editor.

**Tradeoff:** Pointer events on a 4-px target are slightly fiddly. We expand the hit zone to ~8 px via padding while keeping the visible line at 4 px.

### D9. Title generation is best-effort and lazy

**Choice:** When a conversation has no title and finishes its first round-trip (i.e., one user message + one assistant response are both in the transcript), the client fires `POST /api/ai/title` with `{ messages: [...] }`. The endpoint returns a single string. The client writes it back to the conversation index.

**Why:** Doing this on the chat endpoint would couple two unrelated concerns and slow the streaming response. Doing it on the client decouples it cleanly. If the title endpoint fails, the conversation just stays "Untitled" — we never block on it.

## Risks / Trade-offs

- **[Tool-calling round trips inflate latency for structural questions]** → Mitigated by capping `MAX_TOOL_ROUNDS=4` and by the fast-path: simple questions never enter the tool loop. We accept extra latency on the structural path because the alternative is "wrong answer fast."
- **[The model picks the wrong tool / hallucinates a folder name]** → `list_notes_in_folder` and `count_notes` validate `folderId` and return `{ error: "folder_not_found" }` rather than empty results. The model is instructed to call `get_folder_tree` first if the user named a folder.
- **[IndexedDB conversations are per-device — no sync]** → Documented as Non-Goal. If a user complains, we can lift `lib/conversations-db.ts` behind an API and migrate the shape unchanged.
- **[Concurrent writes to IndexedDB from multiple tabs]** → `idb-keyval` serializes per key; we use atomic reads-and-writes inside a single async function for index updates. Last write wins on the index entry, which is acceptable because a single user rarely has the sidebar open in two tabs simultaneously.
- **[Context window pressure as conversations grow]** → For now, send the full transcript per request. If we hit limits, the natural fix is to summarize older turns into a system note; out of scope for this change.
- **[Resize handle vs. macOS smart-zoom / IDE chrome]** → Hit zone is 8px and only on the left edge. No conflict with browser chrome. We disable text selection during drag (`document.body.style.userSelect = "none"`).
- **[Folder path query adds a recursive CTE per search]** → Negligible at expected note counts (< 10k); `Folder.parentId` is indexed. If this becomes hot, materialize folder path on `Folder` row.

## Migration Plan

This is an additive change with no schema migration, but the existing in-memory chat state is lost on first deploy.

Steps:
1. Land `lib/conversations-db.ts` and the IndexedDB schema. On first load with the new code, the sidebar finds no conversations and creates an empty default one — no data loss because nothing was persisted before.
2. Land `lib/ai-tools.ts` (server) and update `lib/embedding.ts` to accept `threshold` and return `folderPath`.
3. Land `app/api/ai/chat/route.ts` rewrite. Backwards compatibility: if the request body has the old shape, the loop still works — we only added new behavior, not changed the request contract.
4. Land `/api/ai/title/route.ts`.
5. Land the sidebar UI changes (`ai-sidebar.tsx`, `conversation-tabs.tsx`, `resize-handle.tsx`).
6. No feature flag — single-user app. If anything breaks, revert.

Rollback: revert the deploy. IndexedDB data remains on the user's machine; revisiting the new code later re-uses it.

## Open Questions

- **Q1: Tab overflow UX.** With 10+ conversations, do we want a "show all" overlay or just rely on horizontal scroll? Defer until a real user has 10+ conversations.
- **Q2: Per-conversation `noteContext` payload size.** Today we send the full BlockNote-extracted text of the current note on every message. With long conversations this re-sends the same context repeatedly. Out of scope here, but flag for follow-up.
- **Q3: Should `count_notes` also break down by folder?** Could return `{ total, byFolder: [{ folderId, folderPath, count }] }`. Not doing it now; add only if the model reaches for it and falls short.
