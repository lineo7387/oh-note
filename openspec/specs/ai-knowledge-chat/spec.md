# ai-knowledge-chat Specification

## Purpose
TBD - created by archiving change ai-knowledge-base-rag. Update Purpose after archive.
## Requirements
### Requirement: AI chat uses knowledge base context
The system SHALL augment the AI chat system prompt with relevant notes retrieved via vector search when the user asks a question.

#### Scenario: Question with relevant notes found
- **WHEN** user sends a message in the AI sidebar
- **AND** vector search returns at least one relevant note
- **THEN** the system prompt includes the retrieved notes' titles and content
- **THEN** the AI answer references the information from those notes
- **THEN** the UI displays which notes were used as sources

#### Scenario: Question with no relevant notes
- **WHEN** user sends a message in the AI sidebar
- **AND** vector search returns no relevant notes
- **THEN** the system prompt indicates no relevant notes were found
- **THEN** the AI answers based on its general knowledge
- **THEN** the UI does not display source notes

### Requirement: Source notes are displayed in the UI
The system SHALL show the user which notes were referenced by the AI in generating its answer.

#### Scenario: Source attribution displayed
- **WHEN** AI generates an answer using retrieved notes
- **THEN** each source note is displayed as a clickable link below the AI message
- **THEN** clicking a source link navigates to that note
- **THEN** the source list shows the note title only (not full content)

### Requirement: Current note context is preserved alongside knowledge base
The system SHALL still include the currently open note's content as context when the user is viewing a note.

#### Scenario: Current note and knowledge base combined
- **WHEN** user is viewing a specific note
- **AND** user asks a question in the AI sidebar
- **THEN** the system prompt includes both the current note content
- **THEN** the system prompt includes relevant notes from the knowledge base
- **THEN** the AI can relate the current note to other notes in the knowledge base

### Requirement: Streaming response format is preserved
The system SHALL continue to stream AI responses in SSE format.

#### Scenario: Streaming with knowledge base context
- **WHEN** user sends a message that triggers knowledge base retrieval
- **THEN** the vector search completes before streaming begins
- **THEN** the AI response is streamed via SSE as before
- **THEN** there is no visible delay in the streaming start

