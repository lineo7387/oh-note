# vector-search Specification

## Purpose
TBD - created by archiving change ai-knowledge-base-rag. Update Purpose after archive.
## Requirements
### Requirement: Semantic similarity search returns relevant notes
The system SHALL accept a text query, convert it to a vector embedding, and return the top-k most semantically similar notes ordered by cosine similarity.

#### Scenario: Search finds relevant notes
- **WHEN** user asks "我之前提到过的项目 deadline 是什么时候？"
- **THEN** the system converts the query to a vector embedding
- **THEN** the system queries pgvector for top-3 notes with highest cosine similarity
- **THEN** only notes belonging to the current user are considered
- **THEN** the results include note title, text snapshot, and similarity score

#### Scenario: Search returns empty when no relevant notes
- **WHEN** user asks a question unrelated to any stored notes
- **THEN** the system returns an empty result set
- **THEN** the AI chat SHALL indicate no relevant notes were found

### Requirement: Search is scoped to current user
The system SHALL filter vector search results by the requesting user's ID.

#### Scenario: User-specific search isolation
- **WHEN** user A performs a vector search
- **THEN** the SQL query MUST include `WHERE "userId" = 'user-a-id'`
- **THEN** only user A's note embeddings are searched

### Requirement: Search results include text snapshot
The system SHALL include a truncated text snapshot of each retrieved note for context building.

#### Scenario: Snapshot included in results
- **WHEN** a note is retrieved via vector search
- **THEN** the result includes the note's title
- **THEN** the result includes up to 2000 characters of the note's text content
- **THEN** the result includes the note's ID for source attribution

