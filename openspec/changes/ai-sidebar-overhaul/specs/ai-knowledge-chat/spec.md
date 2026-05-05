## MODIFIED Requirements

### Requirement: AI chat uses knowledge base context

The system SHALL augment the AI chat with knowledge base context by exposing tools the model can invoke (semantic search, folder tree, listing, counting) and feeding the results back into a tool-calling loop. The system SHALL no longer perform a fixed pre-message vector injection.

#### Scenario: Question routed to semantic search

- **WHEN** the user sends a content-style question in the AI sidebar
- **THEN** the model invokes the semantic search tool
- **THEN** the system executes the tool scoped to the requesting user
- **THEN** the tool's results are appended to the conversation
- **THEN** the AI answer references the information from those results

#### Scenario: Question routed to structural tools

- **WHEN** the user sends a structural question (e.g., "how many notes in folder X", "list everything in Y")
- **THEN** the model invokes one or more of `get_folder_tree`, `list_notes_in_folder`, or `count_notes`
- **THEN** the AI answer uses the tool result rather than a semantic snippet

#### Scenario: Question with no relevant tool result

- **WHEN** every invoked tool returns empty results
- **THEN** the AI answers based on its general knowledge or the current note context only
- **THEN** the UI does not display source notes

### Requirement: Source notes are displayed in the UI

The system SHALL show the user which notes were referenced by the AI in generating its answer, derived from the union of notes returned by tools that surface notes (semantic search and folder listing).

#### Scenario: Source attribution from tool calls

- **WHEN** the AI generated an answer after invoking semantic search and/or folder listing tools
- **THEN** each unique note that appeared in those tool results is displayed as a clickable link below the AI message
- **THEN** clicking a source link navigates to that note
- **THEN** the source list shows the note title (and folder path when available)

#### Scenario: No sources for count-only answers

- **WHEN** the AI answered using only `count_notes` and/or `get_folder_tree`
- **THEN** the source list is empty
- **THEN** the answer text alone communicates the result

### Requirement: Current note context is preserved alongside knowledge base

The system SHALL still include the currently open note's content as context when the user is viewing a note. The current note context SHALL be added to the system prompt regardless of whether tools are invoked.

#### Scenario: Current note flows through the tool-calling loop

- **WHEN** the user is viewing a specific note
- **AND** the user asks a question in the AI sidebar
- **THEN** the system prompt includes the current note's content
- **THEN** any tool the model invokes runs in addition to (not instead of) that context
- **THEN** the AI can relate the current note to other notes surfaced by tools

### Requirement: Streaming response format is preserved

The system SHALL continue to stream the final assistant response to the client over SSE, even when one or more tools were invoked during the loop.

#### Scenario: Streaming for the no-tool path

- **WHEN** the model answers without invoking any tool
- **THEN** the assistant response is streamed via SSE as before
- **THEN** there is no extra round trip introduced

#### Scenario: Streaming for the tool-using path

- **WHEN** the model invokes one or more tools during the request
- **THEN** the server runs the tool-calling loop synchronously
- **THEN** only the model's final assistant message is streamed via SSE
- **THEN** the SSE response shape is unchanged from the client's perspective
