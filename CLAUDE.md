@AGENTS.md

# oh-note Project Guide

## Project Overview

AI-native note-taking application inspired by Youdao Cloud Notes (有道云笔记). Three-column layout: folder tree | editor | AI assistant sidebar.

## Technology Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Neon PostgreSQL (serverless)
- **ORM**: Prisma
- **Auth**: NextAuth.js v5 (Auth.js) with Credentials provider (email + password)
- **Editor**: BlockNote (Block-based WYSIWYG, TipTap/ProseMirror based)
- **AI**: DeepSeek API (deepseek-chat model, streaming SSE)
- **State Management**: Zustand (client UI state)

## Architecture Decisions

- **Cloud-first**: All data persisted to Neon PostgreSQL
- **Block-based editor**: BlockNote JSON stored directly in DB `Json` field
- **AI context V1**: AI assistant only sees the currently open note's content
- **AI sidebar UX**: Floating bubble (bottom-right) → click expands to 320px sidebar
- **File tree**: Fetch all data upfront, build tree in memory (MVP)

## Code Conventions

### File Structure
```
app/
  (auth)/           # Login, register pages (no sidebar)
    login/
    register/
  (main)/           # Main app with three-column layout
    layout.tsx      # Three-column: folder tree | editor | AI sidebar
    page.tsx        # Default/empty state
    note/[id]/      # Note editor page
  api/
    auth/
    folders/
    notes/
    ai/chat/
components/
  editor/           # BlockNote editor wrapper
  folder-tree/      # Recursive folder tree
  ai-sidebar/       # AI assistant panel
  ui/               # Reusable UI components
lib/
  prisma.ts         # Singleton Prisma client
  auth.ts           # Auth utilities
  ai-utils.ts       # BlockNote JSON to plain text extractor
```

### API Route Patterns
- Use `app/api/*` Route Handlers
- Auth check: `const session = await auth()` at top of handler
- Return typed JSON: `NextResponse.json(data)`
- Errors: `return NextResponse.json({ error: "..." }, { status: 400 })`

### Database Access
- Always use singleton Prisma client from `lib/prisma.ts`
- Server Components / Route Handlers only (no client-side DB calls)
- Include `userId` filter in all queries for data isolation

### Component Patterns
- Server Components for data fetching (default)
- `'use client'` only when needed: interactivity, hooks, browser APIs
- Editor and AI sidebar are client components

### AI Integration
- DeepSeek API key stored in `DEEPSEEK_API_KEY` env var
- Streaming: use `ReadableStream` with SSE format
- Context injection: extract plain text from BlockNote JSON before sending to API
- System prompt template: include note title + text content

## Environment Variables

Required in `.env`:
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
DEEPSEEK_API_KEY="sk-..."
```

## Important Notes

- This is a **non-standard Next.js** version. Read `node_modules/next/dist/docs/` for current APIs.
- Do NOT use deprecated patterns. Check deprecation notices in docs.
