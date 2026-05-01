## Why

构建一个类似有道云笔记的云端笔记应用，核心差异化在于深度集成 AI 能力。传统笔记应用只解决"记录"问题，而 AI 原生笔记应用能解决"理解、整理、提炼"问题，让用户与笔记内容产生对话，提升知识管理效率。

## What Changes

- 新增用户认证系统（邮箱+密码），支持注册、登录、会话管理
- 新增文件夹管理体系：支持创建、重命名、删除、层级嵌套
- 新增笔记 CRUD：创建、编辑、删除、在文件夹间移动
- 集成 BlockNote 编辑器（Block-based WYSIWYG），支持文本、标题、列表、代码块等
- 新增 AI 助手侧边栏：浮动气泡形态，点击展开为右侧边栏
- AI 助手基于 DeepSeek API，支持流式对话，上下文为当前打开的笔记内容
- 所有数据云端存储（Neon PostgreSQL），多端可访问

## Capabilities

### New Capabilities

- `user-auth`: 用户认证与授权，包含注册、登录、会话管理
- `folder-management`: 文件夹的增删改查与层级管理
- `note-management`: 笔记的增删改查，包含标题、内容（BlockNote JSON）、文件夹关联
- `blocknote-editor`: Block-based 富文本编辑器集成，支持多种块类型
- `ai-assistant`: AI 助手侧边栏，基于 DeepSeek API 的流式对话，注入当前笔记上下文

### Modified Capabilities

- 无

## Impact

- **新增依赖**: Prisma ORM、BlockNote、NextAuth.js、DeepSeek SDK
- **数据库**: Neon PostgreSQL，新增 `User`、`Folder`、`Note` 表
- **API 路由**: `/api/auth/*`、`/api/folders`、`/api/notes`、`/api/ai/chat`
- **页面结构**: 三栏布局（文件树 | 编辑器 | AI 侧边栏）
- **环境变量**: `DATABASE_URL`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、`DEEPSEEK_API_KEY`
