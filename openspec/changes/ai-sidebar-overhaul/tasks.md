## 1. Dependencies and Server Foundation

- [ ] 1.1 Add `idb-keyval` to `package.json` and run `pnpm install`
- [ ] 1.2 Update `lib/embedding.ts`: add `threshold` parameter to `searchSimilarNotes`; add folder path via recursive CTE join; update `SearchResult` type
- [ ] 1.3 Create `lib/ai-tools.ts`: define tool schemas + server-side executors for `search_notes_semantic`, `get_folder_tree`, `list_notes_in_folder`, `count_notes`
- [ ] 1.4 Create `app/api/ai/title/route.ts`: single-shot endpoint that sends first user+assistant exchange to DeepSeek and returns a title ≤ 24 chars

## 2. Chat Endpoint Rewrite

- [ ] 2.1 Rewrite `app/api/ai/chat/route.ts` to support a tool-calling loop instead of single-shot RAG injection
- [ ] 2.2 Implement `MAX_TOOL_ROUNDS=4` loop termination and fallback to no-tools final call
- [ ] 2.3 Track source notes from `search_notes_semantic` and `list_notes_in_folder` calls and encode them in `X-Source-Notes` header
- [ ] 2.4 Update system prompt to include tool-selection guidance and current-note context
- [ ] 2.5 Ensure SSE streaming contract is preserved for both no-tool and tool-using paths

## 3. Client-Side Conversation Persistence

- [ ] 3.1 Create `lib/conversations-db.ts`: IndexedDB wrapper over `idb-keyval` with `conversations:index`, `conversations:<id>`, and `ui:*` keys
- [ ] 3.2 Define `Conversation`, `ConversationData`, and `ChatMessage` types in `lib/conversations-db.ts`
- [ ] 3.3 Implement CRUD helpers: `listConversations`, `getConversationData`, `createConversation`, `updateConversationMeta`, `updateConversationData`, `deleteConversation`
- [ ] 3.4 Implement `getCurrentConversationId`, `setCurrentConversationId`, `getSidebarWidth`, `setSidebarWidth`

## 4. UI Components

- [ ] 4.1 Create `components/ai-sidebar/conversation-tabs.tsx`: horizontal scrollable tab strip, active-tab highlight, hover-to-delete `×`, trailing `+` button
- [ ] 4.2 Create `components/ai-sidebar/resize-handle.tsx`: left-edge drag handle, `mousedown` → width updates → `mouseup` → persist to localStorage, clamp to [280, 720], suppress text selection during drag
- [ ] 4.3 Add a "thinking…" indicator component in `components/ai-sidebar/` (reused inside the main sidebar)

## 5. Sidebar Integration

- [ ] 5.1 Rewrite `components/ai-sidebar/ai-sidebar.tsx` state management: replace single `messages` state with per-conversation storage via `lib/conversations-db.ts`
- [ ] 5.2 Wire conversation tabs: create, switch, delete, auto-follow defaults
- [ ] 5.3 Wire resize handle: read `ui:sidebar-width` on mount, pass width to the sidebar container
- [ ] 5.4 Wire title generation: after first assistant message, call `/api/ai/title`, update index on success
- [ ] 5.5 Wire "thinking…" indicator: show while awaiting the chat response (tool loop happens server-side, so client sees normal request latency)
- [ ] 5.6 Ensure context-note selection and `autoFollow` are scoped to the active conversation

## 6. Validation

- [ ] 6.1 Type-check: `pnpm type-check` passes with no new errors
- [ ] 6.2 Manual QA: create 3 conversations, send messages in each, reload page, verify restore
- [ ] 6.3 Manual QA: ask "how many notes in folder X" and verify the answer is correct (not capped at 3)
- [ ] 6.4 Manual QA: resize sidebar, reload, verify width persists
