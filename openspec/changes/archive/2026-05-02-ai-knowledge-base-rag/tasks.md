## 1. Database & Schema Setup

- [x] 1.1 Install `pgvector` Prisma extension and add to schema
- [x] 1.2 Create `NoteEmbedding` model in Prisma schema with vector(1024), textSnapshot, note relation
- [ ] 1.3 Run Prisma migration to create table and enable pgvector extension
- [ ] 1.4 Verify pgvector is enabled in Neon PostgreSQL

## 2. Embedding Generation Core

- [x] 2.1 Create `lib/embedding.ts` with `generateEmbedding(text)` function (SiliconFlow API)
- [x] 2.2 Add `SILICONFLOW_API_KEY` to environment variables and `.env.example`
- [x] 2.3 Create `upsertNoteEmbedding(noteId, userId, title, content)` function in `lib/embedding.ts`
- [x] 2.4 Add embedding upsert call to `PUT /api/notes/[id]` (after note save, non-blocking)
- [x] 2.5 Add embedding upsert call to note creation API (`POST /api/notes`)

## 3. Vector Search Core

- [x] 3.1 Create `searchSimilarNotes(queryText, userId, topK)` function in `lib/embedding.ts`
- [x] 3.2 Implement cosine similarity query using Prisma + pgvector raw query
- [x] 3.3 Add userId filtering to ensure data isolation
- [x] 3.4 Return structured results with title, textSnapshot, noteId, similarity score

## 4. AI Chat Integration

- [x] 4.1 Update `POST /api/ai/chat` to accept query and perform vector search before calling DeepSeek
- [x] 4.2 Build knowledge base context string from retrieved notes (title + truncated content)
- [x] 4.3 Update system prompt to include both knowledge base results and current note context
- [x] 4.4 Include source note metadata in response headers or JSON wrapper for UI attribution
- [x] 4.5 Ensure streaming SSE format is preserved

## 5. UI Enhancements

- [x] 5.1 Update `AiSidebar` to parse and display source note links below AI messages
- [x] 5.2 Make source note links clickable (navigate to `/note/[id]`)
- [ ] 5.3 Show loading indicator during vector search phase
- [ ] 5.4 Display "no relevant notes found" indicator when appropriate
- [x] 5.5 Update empty state message to reflect knowledge base capability

## 6. Batch Backfill Script

- [x] 6.1 Create `scripts/backfill-embeddings.ts` script
- [x] 6.2 Query all notes without an embedding, process in batches of 10
- [x] 6.3 Add rate limiting delay between batches (avoid OpenAI rate limits)
- [x] 6.4 Add progress logging and resume-from-failure support
- [x] 6.5 Add package.json script: `"backfill-embeddings": "tsx scripts/backfill-embeddings.ts"`

## 7. Testing & Verification

- [ ] 7.1 Test note save triggers embedding generation correctly
- [ ] 7.2 Test vector search returns relevant results for semantic queries
- [ ] 7.3 Test user isolation (user A cannot search user B's notes)
- [ ] 7.4 Test AI chat includes knowledge base context in answers
- [ ] 7.5 Test source attribution links work in UI
- [ ] 7.6 Test backfill script on existing notes
- [ ] 7.7 Verify embedding failure does not break note save

## 8. Documentation & Cleanup

- [x] 8.1 Update README with new `SILICONFLOW_API_KEY` env variable requirement
- [x] 8.2 Document backfill script usage
- [x] 8.3 Run `npm run build` and fix any TypeScript errors
- [ ] 8.4 Archive the change with `openspec archive`
