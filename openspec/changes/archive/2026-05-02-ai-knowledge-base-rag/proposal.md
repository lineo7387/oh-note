## Why

当前 AI 助手只能看到用户正在编辑的单个笔记内容作为上下文。随着用户积累了大量笔记，AI 无法利用整个知识库的信息来回答跨笔记关联的问题（如"我之前在哪个笔记里提到过这个项目？"）。将 AI 升级为知识库 RAG（Retrieval-Augmented Generation）模式，让 AI 能够检索并引用用户所有相关笔记，显著提升 AI 回答的深度和准确性。

## What Changes

- 在 Neon PostgreSQL 中启用 `pgvector` 扩展，添加向量存储能力
- 新建 `NoteEmbedding` 数据表，存储笔记的向量嵌入和文本快照
- 集成 Embedding API（OpenAI text-embedding-3-small 或 DeepSeek），在笔记保存时实时生成/更新向量
- 改造 AI 聊天 API：用户提问时先向量化查询，通过 pgvector 检索 top-k 相关笔记，将结果注入 DeepSeek 上下文
- AI 侧边栏 UI 显示引用来源（显示 AI 参考了哪些笔记）
- 提供一次性脚本，为现有所有笔记批量生成初始向量

## Capabilities

### New Capabilities

- `note-embedding`: 笔记内容的向量嵌入生成、存储和同步管理
- `vector-search`: 基于语义相似度的笔记检索（RAG retrieve 阶段）
- `ai-knowledge-chat`: AI 聊天利用知识库上下文进行 RAG 增强回答

### Modified Capabilities

- （无现有 spec 需要修改）

## Impact

- **数据库**: Neon PostgreSQL 需启用 `pgvector` 扩展；新增 `NoteEmbedding` 表及迁移
- **API**: `POST /api/ai/chat` 增加向量检索步骤；笔记保存 API（`PUT /api/notes/:id`）增加 embedding 更新逻辑
- **组件**: `AiSidebar` 增加引用来源展示
- **依赖**: 新增 OpenAI SDK 或直接使用 fetch 调用 Embedding API
- **环境变量**: 需配置 Embedding API Key（`OPENAI_API_KEY` 或 `DEEPSEEK_API_KEY`）
- **部署**: 现有笔记需要通过一次性脚本补全向量数据
