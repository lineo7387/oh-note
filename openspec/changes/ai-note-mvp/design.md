## Context

当前项目为 Next.js 16 + React 19 + Tailwind v4 的空白项目，仅有基础模板页面。目标是构建一个云端优先的 AI 笔记应用，采用有道云笔记的三栏布局风格（文件树 | 编辑器 | AI 侧边栏）。

## Goals / Non-Goals

**Goals:**
- 实现完整的用户认证系统（邮箱+密码）
- 实现文件夹的层级管理和笔记的组织
- 集成 BlockNote 编辑器提供 Block-based WYSIWYG 编辑体验
- 实现浮动 AI 助手侧边栏，基于 DeepSeek API 流式对话
- AI 助手注入当前笔记内容作为上下文（V1 阶段）
- 所有数据持久化到 Neon PostgreSQL

**Non-Goals:**
- 实时多人协作编辑
- 语义搜索 / 向量数据库
- Inline AI（编辑器内选中文字的 AI 菜单）
- 笔记分享 / 导出功能
- 移动端适配（先桌面端）
- 社交登录（Phase 2 再考虑）
- AI 对话历史持久化（当前会话级）

## Decisions

### 数据库：PostgreSQL + Prisma
- **选择**: Neon PostgreSQL（Serverless）+ Prisma ORM
- **理由**: 用户已有 Neon 使用意愿；Prisma 是 TypeScript 生态最成熟的 ORM，支持迁移、类型安全；Neon 免费额度足够 MVP
- **替代方案**: Supabase（用户表示已满），本地 PostgreSQL（需要用户自己维护）

### 编辑器：BlockNote
- **选择**: BlockNote（基于 TipTap/ProseMirror）
- **理由**: 原生 Block-based 架构，输出结构化 JSON 便于数据库存储；有成熟的 AI 扩展生态；支持 Slash 命令和拖拽排序
- **替代方案**: Lexical（Meta 出品，可扩展但生态较新），Slate（灵活但需大量自定义）

### AI 接入：DeepSeek API
- **选择**: DeepSeek Chat API（流式输出）
- **理由**: 用户指定；性价比高；支持长上下文（64K）
- **策略**: 默认 deepseek-chat 模型；将当前笔记的纯文本内容注入 system prompt

### 认证：NextAuth.js (Auth.js v5)
- **选择**: NextAuth.js with Credentials Provider
- **理由**: 与 Next.js App Router 深度集成；支持 JWT 会话；邮箱+密码实现快
- **密码存储**: bcrypt 哈希

### AI 侧边栏交互模式
- **选择**: 默认右下角浮动气泡，点击展开为 320px 固定宽度右侧边栏
- **理由**: 不占用编辑空间；展开时编辑器自适应收缩；localStorage 记住用户偏好
- **替代方案**: 始终固定侧边栏（占用空间），覆盖式侧边栏（遮挡内容）

### 笔记内容存储格式
- **选择**: BlockNote JSON 直接存入 PostgreSQL `Json` 字段
- **理由**: 结构化数据，无需额外解析；BlockNote 原生格式
- **AI 上下文处理**: 后端提供 JSON-to-plain-text 提取器，将 BlockNote JSON 转为 Markdown/纯文本后注入 prompt

### 文件树数据获取策略
- **选择**: 前端一次性拉取全部文件夹和笔记数据，内存中构建树
- **理由**: MVP 阶段数据量小，实现简单；避免多次请求和复杂的懒加载状态管理
- **未来**: 数据量大时改为虚拟滚动 + 按需加载

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| BlockNote 存储的 JSON 体积可能较大 | 单笔记大小通常可控（<100KB），PostgreSQL JSON 字段无问题 |
| DeepSeek API 延迟影响用户体验 | 流式输出（SSE）缓解等待感；添加打字动画 |
| AI 上下文长度超限 | 笔记内容过长时自动截断或分段；DeepSeek 支持 64K 上下文 |
| 编辑器与 AI 侧边栏状态同步复杂 | AI 上下文只在用户发送消息时快照当前笔记内容，不实时同步 |
| 自关联文件夹查询性能 | MVP 阶段数据量小，Prisma `include` 多层展开足够；未来加索引或改用闭包表 |

## Migration Plan

- Phase 1: 数据库 Schema + Prisma + 认证系统
- Phase 2: 三栏布局骨架 + 文件树 UI + 文件夹/笔记 API
- Phase 3: BlockNote 编辑器集成
- Phase 4: AI 侧边栏 + DeepSeek API 接入

## Open Questions

- 是否需要笔记的 `slug` 或 `path` 字段用于友好 URL？（MVP 阶段可用 ID）
- 文件夹排序策略：按名称、创建时间、还是支持手动拖拽排序？（MVP 按名称排序）
- 删除文件夹时是否级联删除内部笔记？（MVP：不允许删除非空文件夹，或提示用户）
