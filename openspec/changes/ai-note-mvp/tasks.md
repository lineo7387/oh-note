## 1. Project Setup

- [x] 1.1 Install dependencies: Prisma, @prisma/client, next-auth, blocknote, deepseek-sdk, bcryptjs, zustand
- [x] 1.2 Initialize Prisma with PostgreSQL provider and create `.env` with `DATABASE_URL`
- [x] 1.3 Add `.env` to `.gitignore`
- [x] 1.4 Run initial Prisma migration to set up database

## 2. Database Schema

- [x] 2.1 Define Prisma schema: `User` model (id, email, passwordHash, createdAt)
- [x] 2.2 Define Prisma schema: `Folder` model (id, name, parentId, userId, createdAt) with self-relation
- [x] 2.3 Define Prisma schema: `Note` model (id, title, content Json, folderId, userId, createdAt, updatedAt)
- [x] 2.4 Add foreign keys and indexes (userId on Folder/Note, parentId on Folder)
- [x] 2.5 Run Prisma migrate dev to apply schema
- [x] 2.6 Generate Prisma client

## 3. Authentication

- [x] 3.1 Configure NextAuth with Credentials provider (email + password)
- [x] 3.2 Implement register API route (`/api/auth/register`) with bcrypt password hashing
- [x] 3.3 Implement login/logout session handling
- [x] 3.4 Add auth middleware to protect main application routes
- [x] 3.5 Create login page UI (`/login`)
- [x] 3.6 Create register page UI (`/register`)

## 4. API Routes - Folder Management

- [x] 4.1 Create `GET /api/folders` to return all folders for authenticated user
- [x] 4.2 Create `POST /api/folders` to create a new folder (with optional parentId)
- [x] 4.3 Create `PATCH /api/folders/:id` to rename a folder
- [x] 4.4 Create `DELETE /api/folders/:id` to delete an empty folder
- [x] 4.5 Add validation: prevent deleting non-empty folders

## 5. API Routes - Note Management

- [x] 5.1 Create `GET /api/notes?folderId=` to list notes in a folder
- [x] 5.2 Create `POST /api/notes` to create a new note in a folder
- [x] 5.3 Create `GET /api/notes/:id` to fetch a single note's content
- [x] 5.4 Create `PATCH /api/notes/:id` to update note title and content
- [x] 5.5 Create `DELETE /api/notes/:id` to delete a note
- [x] 5.6 Create `PATCH /api/notes/:id/move` to move a note between folders

## 6. Main Layout & File Tree UI

- [x] 6.1 Create `(main)` route group with three-column layout (folder tree | editor area | AI sidebar placeholder)
- [x] 6.2 Build folder tree component with expand/collapse and recursive rendering
- [x] 6.3 Implement "New Folder" button and inline rename editing
- [x] 6.4 Implement context menu for folder operations (rename, delete)
- [x] 6.5 Build note list component showing notes in selected folder
- [x] 6.6 Add "New Note" button in note list area
- [x] 6.7 Implement note selection to load editor

## 7. BlockNote Editor Integration

- [x] 7.1 Install and configure BlockNote editor component
- [x] 7.2 Integrate editor into the center panel of the main layout
- [x] 7.3 Load existing note content into editor on note selection
- [x] 7.4 Implement auto-save: debounced PATCH to `/api/notes/:id` on content change
- [x] 7.5 Implement note title editing in the editor header area
- [x] 7.6 Add loading and empty states for the editor

## 8. AI Assistant Sidebar

- [x] 8.1 Create floating AI bubble component (bottom-right, collapsible)
- [x] 8.2 Create AI sidebar panel (320px width, slide-in animation)
- [x] 8.3 Implement expand/collapse toggle and localStorage persistence
- [x] 8.4 Build chat UI: message list (user messages right, AI messages left), input field, send button
- [x] 8.5 Create `POST /api/ai/chat` route handler with DeepSeek API integration
- [x] 8.6 Implement SSE streaming from DeepSeek API to frontend
- [x] 8.7 Build system prompt injection: extract plain text from current note's BlockNote JSON and inject as context
- [x] 8.8 Update AI context when user switches between notes
- [x] 8.9 Handle empty note context gracefully
- [x] 8.10 Add typing indicator and loading state during AI response generation

## 9. Polish & Integration

- [x] 9.1 Add error handling and toast notifications for API failures
- [x] 9.2 Add loading skeletons for folder tree and note list
- [x] 9.3 Implement empty states (no folders, no notes, empty editor)
- [x] 9.4 Add keyboard shortcuts (Ctrl+S for save, Escape to collapse AI sidebar)
- [ ] 9.5 Verify responsive behavior of three-column layout (minimum widths, overflow)
- [ ] 9.6 Test end-to-end flow: register → create folder → create note → edit → ask AI
