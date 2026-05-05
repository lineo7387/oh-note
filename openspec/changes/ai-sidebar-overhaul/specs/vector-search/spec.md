## MODIFIED Requirements

### Requirement: Semantic similarity search returns relevant notes

The system SHALL accept a text query, convert it to a vector embedding, and return the top-k most semantically similar notes ordered by cosine similarity, filtered by a minimum similarity threshold. The default top-k SHALL be 8 and the default minimum similarity SHALL be 0.3.

#### Scenario: Search finds relevant notes

- **WHEN** user asks "我之前提到过的项目 deadline 是什么时候？"
- **THEN** the system converts the query to a vector embedding
- **THEN** the system queries pgvector for the top-k notes with highest cosine similarity
- **THEN** only notes belonging to the current user are considered
- **THEN** results below the similarity threshold are excluded
- **THEN** the results include note id, title, text snapshot, similarity score, and folder path

#### Scenario: Search returns empty when no relevant notes

- **WHEN** user asks a question unrelated to any stored notes
- **THEN** the system returns an empty result set
- **THEN** any caller using the result SHALL treat the empty result as "no relevant notes"

#### Scenario: Caller-supplied top-k and threshold

- **WHEN** the caller supplies a top-k or threshold parameter
- **THEN** the system uses the supplied values, subject to a server-side maximum top-k
- **WHEN** no values are supplied
- **THEN** the system uses the default top-k of 8 and minimum similarity of 0.3

### Requirement: Search results include text snapshot

The system SHALL include a truncated text snapshot of each retrieved note for context building, plus identifying metadata.

#### Scenario: Snapshot included in results

- **WHEN** a note is retrieved via vector search
- **THEN** the result includes the note's title
- **THEN** the result includes up to 2000 characters of the note's text content
- **THEN** the result includes the note's id for source attribution
- **THEN** the result includes the note's folder path joined from the folder hierarchy

## ADDED Requirements

### Requirement: Folder path is computed at query time

The system SHALL compute the folder path for each search result at query time by joining the note to its folder and walking the folder's parent chain. The system SHALL NOT require re-embedding existing notes to surface folder context.

#### Scenario: Notes in nested folders return their full path

- **WHEN** a note is stored in a folder nested two levels deep (e.g., "Work" > "Projects" > "oh-note")
- **AND** the note is returned by a vector search
- **THEN** the result's folder path is "Work / Projects / oh-note"
- **THEN** the path is derived from the current folder hierarchy, not from a snapshot taken at indexing time

#### Scenario: Notes at the root return an empty or root-only path

- **WHEN** a note has no folder (root-level)
- **THEN** the result's folder path is empty or a defined root marker
- **THEN** the result is otherwise unchanged
