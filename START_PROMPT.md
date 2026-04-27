# oh-note 新对话启动提示词

复制以下内容到新对话中发送，即可快速恢复项目上下文：

---

## 快速启动（复制即用）

```
继续开发 oh-note AI 笔记应用。当前 OpenSpec change 是 `ai-note-mvp`。

项目技术栈：Next.js 16 + React 19 + Tailwind v4 + Neon PostgreSQL + Prisma + BlockNote + DeepSeek API
当前状态：proposal/design/specs/tasks 全部就绪，等待实现
阶段规划：Phase 1（数据库+认证）→ Phase 2（文件树+编辑器）→ Phase 3（AI助手）

请读取 openspec/changes/ai-note-mvp/tasks.md 了解任务列表，按顺序开始实现。
需要 UI/UX 设计时，请显式调用 /ui-ux-pro-max。
```

---

## 指定具体任务

如果想从某个具体任务开始，在末尾加上：

```
先完成任务 X.Y：{任务描述}
```

例如：
```
...（上面通用部分）...
先完成任务 1.1：安装项目依赖并初始化 Prisma。
```

---

## 只做 UI/UX 设计

```
为 oh-note AI 笔记应用做 UI/UX 设计。

项目技术栈：Next.js 16 + React 19 + Tailwind v4
设计需求：{描述你的设计需求}

请调用 /ui-ux-pro-max 进行专业设计。
```

---

## 关键记忆速查

| 项目 | 选择 |
|------|------|
| 数据库 | Neon PostgreSQL |
| 编辑器 | BlockNote（Block-based WYSIWYG）|
| AI | DeepSeek API（deepseek-chat，SSE 流式）|
| 认证 | NextAuth.js v5（邮箱+密码）|
| 布局 | 三栏：文件树（200px）\| 编辑器（flex-1）\| AI 侧边栏（320px，可折叠）|
| AI 上下文 | V1：仅当前笔记内容 |

---

## 文件位置

- 设计文档：`openspec/changes/ai-note-mvp/design.md`
- 任务列表：`openspec/changes/ai-note-mvp/tasks.md`
- 项目规范：`CLAUDE.md`
