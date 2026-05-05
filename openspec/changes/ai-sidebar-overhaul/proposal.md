## Why

The AI sidebar today only supports a single ever-growing conversation, retrieves a fixed top-3 semantic matches, and is locked at 320px. Users hit three concrete pain points:

1. **No way to start a new conversation.** A long session becomes cluttered and there is no separation between unrelated topics.
2. **Aggregate questions silently fail.** Asking "how many notes are in folder X" returns "3" because the system only ever sees three semantic matches — there is no path to structured/aggregate queries.
3. **The 320px panel is too narrow** to comfortably read longer answers or multi-source citations.

## What Changes

- Add **multi-conversation support** with IndexedDB persistence, AI-generated titles, switching, deletion, and per-conversation context state.
- Add **horizontal conversation tabs** at the top of the sidebar with a `[+]` new-conversation button.
- Make the **sidebar width user-resizable** via a left-edge drag handle, persisted in localStorage; range `[280, 720]` px.
- Replace the fixed top-3 retrieval pipeline with **AI tool calling**, exposing four tools the model can choose between:
  - `search_notes_semantic(query, topK?)` — vector search (default topK 8, similarity threshold 0.3)
  - `get_folder_tree()` — full folder hierarchy
  - `list_notes_in_folder(folderId, recursive?)` — structured listing
  - `count_notes(folderId?)` — aggregate count
- **Inject folder paths** into semantic search results at query time (no re-embedding required).
- Update the system prompt to instruct the model to choose tools based on whether the question is semantic or structural.

## Capabilities

### New Capabilities
- `ai-conversations`: Persistent multi-conversation state (create, switch, delete, auto-title) backed by IndexedDB; per-conversation context-note selection and auto-follow flag.
- `ai-sidebar-ui`: Resizable sidebar width with persistence; conversation tabs UI affordances.
- `ai-tool-calling`: Tool-calling-based retrieval allowing the AI to choose between semantic search and structured queries (folder tree, list, count) over the user's notes.

### Modified Capabilities
- `ai-knowledge-chat`: Retrieval is no longer a single pre-message vector search; the chat endpoint now drives a tool-calling loop. Source attribution is derived from whichever tools the AI invoked. Folder paths are surfaced to the model and the UI.
- `vector-search`: Default topK raised from 3 to 8; results filtered by minimum similarity 0.3; folder path joined into result rows.

## Impact

- **Code (new):**
  - `lib/conversations-db.ts` — IndexedDB CRUD via `idb-keyval` (or thin wrapper).
  - `lib/ai-tools.ts` — tool schemas + server-side execution for the four tools.
  - `components/ai-sidebar/conversation-tabs.tsx` — top tab strip.
  - `components/ai-sidebar/resize-handle.tsx` — drag-to-resize edge.
  - `app/api/ai/title/route.ts` — single-shot endpoint to summarize a conversation title.
- **Code (modified):**
  - `components/ai-sidebar/ai-sidebar.tsx` — wired to the conversation store, gains tabs + resize.
  - `app/api/ai/chat/route.ts` — switches from one-shot RAG injection to a tool-calling loop with streaming.
  - `lib/embedding.ts` — `searchSimilarNotes` accepts threshold; result rows include folder path.
- **Dependencies:**
  - Add `idb-keyval` (or `dexie`) for IndexedDB wrapper.
- **Data:** No Prisma schema changes. No re-embedding of existing notes.
- **Risk:** Tool-calling loop adds round-trips; first-token latency may increase for tool-using questions. Mitigated by the model going straight to streaming when no tool is invoked.
