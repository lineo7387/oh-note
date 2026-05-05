## ADDED Requirements

### Requirement: AI chat exposes tools the model may call to answer the user's question

The system SHALL provide the AI model with a fixed set of tools at chat-completion time. The model SHALL choose to invoke zero or more tools to gather context before answering. The system SHALL execute requested tool calls server-side and feed the results back into the model loop.

#### Scenario: Simple semantic question takes the no-tool path

- **WHEN** the user asks a question the model can answer from prior turns alone
- **THEN** the model returns an assistant message with no tool calls
- **THEN** the system streams that response directly to the client
- **THEN** no extra round trip is incurred

#### Scenario: Question requiring retrieval invokes a tool

- **WHEN** the user asks a semantic question over their notes
- **THEN** the model invokes `search_notes_semantic` with an appropriate query
- **THEN** the system executes the tool, scoped to the requesting user
- **THEN** the tool result is appended to the conversation as a tool message
- **THEN** the model is invoked again with the updated conversation
- **THEN** the model produces a final assistant message that the system streams to the client

#### Scenario: Multi-tool dispatch within a single turn

- **WHEN** the user asks a question whose answer requires both a folder listing and a semantic lookup
- **THEN** the model may invoke multiple tools across one or more rounds
- **THEN** each tool's result is appended before the model is re-invoked
- **THEN** the loop terminates when the model returns an assistant message with no further tool calls

#### Scenario: Loop terminates after a maximum number of rounds

- **WHEN** the model continues to request tools beyond the configured maximum number of rounds
- **THEN** the system invokes the model one final time with tools disabled
- **THEN** the model is forced to produce a final assistant response
- **THEN** the response is streamed to the client

### Requirement: Semantic search tool returns relevant notes with folder paths

The system SHALL expose a `search_notes_semantic` tool that performs a vector search scoped to the requesting user, filters by a minimum similarity threshold, and returns each result's note id, title, folder path, snippet, and similarity score.

#### Scenario: Searching returns enriched results

- **WHEN** the model invokes `search_notes_semantic` with a query
- **THEN** the system runs a vector search scoped to the user's note embeddings
- **THEN** results below the similarity threshold are excluded
- **THEN** each returned row includes the note id, title, folder path, snippet, and similarity score
- **THEN** the result count is at most the requested top-k

#### Scenario: top-k is bounded

- **WHEN** the model requests a top-k value larger than the maximum
- **THEN** the system caps top-k to its server-side maximum
- **THEN** the tool result reflects the capped value

### Requirement: Folder-tree tool returns the user's full folder hierarchy

The system SHALL expose a `get_folder_tree` tool that returns the requesting user's folder hierarchy as nested JSON, with each node carrying its id, name, and children.

#### Scenario: Folder tree returned for the current user

- **WHEN** the model invokes `get_folder_tree`
- **THEN** the system returns a tree containing only folders owned by the requesting user
- **THEN** each folder node includes its id, name, and an array of child folders
- **THEN** the tree's structure matches the parent/child relationships in the database

#### Scenario: Folder tree for a user with no folders

- **WHEN** the requesting user has no folders
- **THEN** the tool returns an empty array

### Requirement: Folder listing tool returns notes in a folder

The system SHALL expose a `list_notes_in_folder` tool that, given a folder id, returns the notes in that folder, optionally including notes from descendant folders, scoped to the requesting user.

#### Scenario: Listing direct children only

- **WHEN** the model invokes `list_notes_in_folder` with a folder id and recursive false
- **THEN** the system returns notes whose `folderId` equals the given folder id
- **THEN** each result includes the note id, title, and folder path
- **THEN** notes are ordered by most recently updated first
- **THEN** the result count is bounded by a server-side cap

#### Scenario: Listing recursively across descendants

- **WHEN** the model invokes `list_notes_in_folder` with a folder id and recursive true
- **THEN** the system returns notes from the given folder and all its descendant folders
- **THEN** each result is scoped to the requesting user

#### Scenario: Folder not found

- **WHEN** the model invokes the tool with a folder id that does not exist or does not belong to the user
- **THEN** the tool returns a structured error indicating the folder was not found
- **THEN** the assistant loop continues without aborting

### Requirement: Counting tool returns aggregate note counts

The system SHALL expose a `count_notes` tool that returns an aggregate count of notes for the requesting user, optionally scoped to a folder and optionally recursive.

#### Scenario: Counting all notes for the user

- **WHEN** the model invokes `count_notes` with no folder id
- **THEN** the system returns the total number of notes owned by the requesting user

#### Scenario: Counting notes within a folder

- **WHEN** the model invokes `count_notes` with a folder id and recursive false
- **THEN** the system returns the number of notes whose `folderId` equals the given id

#### Scenario: Counting notes recursively

- **WHEN** the model invokes `count_notes` with a folder id and recursive true
- **THEN** the system returns the number of notes in that folder and all its descendant folders

#### Scenario: Counting against a missing folder

- **WHEN** the model invokes the tool with a folder id that does not exist or does not belong to the user
- **THEN** the tool returns a structured error indicating the folder was not found

### Requirement: Tool execution is scoped to the requesting user

The system SHALL ensure that every tool execution is filtered by the requesting user's id, regardless of the arguments the model supplies.

#### Scenario: Cross-user data is never returned

- **WHEN** any tool runs
- **THEN** every database query includes a filter on the requesting user's id
- **THEN** no result references notes, folders, or embeddings owned by a different user

### Requirement: System prompt directs tool selection

The system SHALL include guidance in the chat system prompt that explains when to use each tool, so that the model selects semantic search for content questions and structural tools for folder/aggregate questions.

#### Scenario: Aggregate question reaches the count tool

- **WHEN** the user asks "how many notes are in folder X"
- **THEN** the model invokes `get_folder_tree` to resolve the folder name
- **THEN** the model invokes `count_notes` with the resolved folder id
- **THEN** the assistant response uses the returned count

#### Scenario: Content question reaches the semantic search tool

- **WHEN** the user asks a question about the substance of their notes
- **THEN** the model invokes `search_notes_semantic` rather than a structural tool
- **THEN** the assistant response references the returned snippets
