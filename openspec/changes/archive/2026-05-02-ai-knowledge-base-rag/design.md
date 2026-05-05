## Context

当前 AI 助手通过 `POST /api/ai/chat` 接收用户消息和当前笔记的纯文本上下文，直接调用 DeepSeek API 生成回答。整个系统没有持久化的聊天历史，也没有跨笔记的检索能力。

用户的笔记数据存储在 Neon PostgreSQL 中，使用 Prisma ORM。笔记内容为 BlockNote JSON 格式。目标是让 AI 能够基于用户全部笔记库进行语义检索和回答。

## Goals / Non-Goals

**Goals:**
- 用户提问时，AI 能自动检索知识库中最相关的笔记作为上下文
- 笔记保存后，其向量嵌入在秒级时间内同步更新
- 现有笔记可通过一次性脚本完成初始向量构建
- AI 回答时显示引用了哪些笔记（可追溯）
- 数据隔离：用户只能检索到自己的笔记

**Non-Goals:**
- 多轮对话持久化（仍保持当前无状态设计）
- 实时协作/多端同步向量
- 笔记内分块切分（整篇笔记作为检索单位）
- 混合搜索（BM25 + 向量）、重排序等高级检索策略（后续迭代）
- 本地 Embedding 模型部署

## Decisions

### 1. 向量数据库：pgvector（Neon PostgreSQL）

**选择**：在现有 Neon PostgreSQL 中启用 `pgvector` 扩展。

**理由**：
- Neon 原生支持 pgvector，零额外基础设施成本
- 与现有 Prisma + PostgreSQL 技术栈一致，无需学习新系统
- 向量和业务数据在同一数据库，事务性更新更简单

**替代方案**：Pinecone / Milvus / Qdrant
- 放弃原因：增加运维复杂度、额外成本、与现有数据分离

### 2. Embedding 模型：OpenAI text-embedding-3-small

**选择**：使用 OpenAI text-embedding-3-small（1536 维）。

**理由**：
- 成本低（$0.02/1M tokens），质量优秀
- 向量维度 1536，与 pgvector 兼容
- 多语言支持良好（用户笔记为中文）

**替代方案**：DeepSeek Embedding
- 放弃原因：DeepSeek 主要提供 chat API，embedding 稳定性和文档不如 OpenAI

**替代方案**：text-embedding-3-large
- 放弃原因：成本更高（$0.13/1M tokens），性能提升对 MVP 不显著

### 3. 同步策略：实时同步（笔记保存后）

**选择**：在笔记保存 API（`PUT /api/notes/:id`）中，保存完成后立即异步调用 Embedding API 更新向量。

**理由**：
- MVP 阶段实现最简单，无队列/定时任务依赖
- 几百毫秒延迟用户感知不强
- Neon serverless 环境中后台任务受限

**风险缓解**：Embedding API 调用失败不应阻塞笔记保存，使用 `try/catch` 隔离，失败时静默跳过（用户笔记不会丢失，只是 AI 暂时看不到最新内容）。

### 4. 检索单位：整篇笔记

**选择**：每篇笔记生成一个向量嵌入。

**理由**：
- 实现最简单，无需分块逻辑
- 大多数笔记为"一篇一个主题"，整篇粒度合理
- BlockNote JSON 提取文本后直接嵌入，保留文档级语义

**后续迭代**：如遇到超长笔记检索效果差，可引入按块/滑动窗口切分。

### 5. RAG 管道：简单 top-k 检索

**选择**：用户提问 → 查询向量化 → pgvector `cosine similarity` 检索 top-3 → 拼接笔记标题+文本注入 system prompt。

**理由**：
- 简单可靠，易于调试
- top-3 在 320px 侧边栏中上下文不会过长

**后续迭代**：混合搜索（全文 + 向量）、重排序、元数据过滤（按文件夹/时间）。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 笔记保存时 Embedding API 调用失败，向量数据 stale | API 调用用 `try/catch` 包裹，失败不阻塞保存；提供手动刷新按钮（后续迭代） |
| 向量数据量增长导致查询变慢 | pgvector 的 HNSW 索引；当前数据量（<10K 笔记）无需担心 |
| 整篇笔记过长，向量语义模糊 | MVP 先验证效果，后续引入分块策略 |
| OpenAI API 不可用或成本上升 | 抽象 embedding 接口，未来可切换至其他 provider |
| 数据隐私：笔记内容发送至 OpenAI | 使用 OpenAI API（非 Azure），数据不用于训练；敏感用户可后续支持本地模型 |
| 批量初始化脚本对大量笔记耗时过长 | 脚本支持断点续跑（记录已处理 noteId），分批处理避免 API rate limit |

## Migration Plan

1. **数据库迁移**：
   - Prisma migration：启用 `pgvector` 扩展，创建 `NoteEmbedding` 表
   - 手动在 Neon Console 中确认扩展已启用

2. **代码部署**：
   - 部署包含 embedding 同步逻辑的代码
   - 配置 `OPENAI_API_KEY` 环境变量

3. **数据回填**：
   - 运行一次性脚本 `scripts/backfill-embeddings.ts`
   - 为所有现有笔记生成初始向量
   - 脚本支持分批和断点续跑

4. **回滚**：
   - 删除 `NoteEmbedding` 表和相关代码即可回滚到单笔记上下文模式
   - 原始笔记数据不受影响

## Open Questions

- 是否需要支持用户手动"排除某笔记不出现在 AI 检索中"？（后续迭代考虑）
- top-k 取多少个笔记最优？（先取 3，根据实际效果调整）
- 是否需要在 AI 回答中精确到笔记内的段落/块级别引用？（当前先精确到笔记级别）
