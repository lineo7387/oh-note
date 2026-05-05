## ADDED Requirements

### Requirement: Multiple conversations are persisted client-side

The system SHALL allow the user to maintain multiple distinct AI conversations, persisted in IndexedDB on the local device, surviving page reloads.

#### Scenario: Conversations survive a reload

- **WHEN** the user has at least one message in conversation A
- **AND** the user reloads the page
- **THEN** conversation A is restored from IndexedDB
- **THEN** the active conversation, its messages, and its context-note selection are reinstated

#### Scenario: First-time use with no stored data

- **WHEN** the sidebar loads and IndexedDB has no conversations
- **THEN** the system creates a single empty conversation as the active one
- **THEN** the conversation has no title
- **THEN** the message list is empty

### Requirement: User can create a new conversation

The system SHALL provide an explicit affordance to start a new conversation, switching the active conversation to the newly created empty one.

#### Scenario: Creating a new conversation from the tab strip

- **WHEN** the user clicks the `+` button in the conversation tab strip
- **THEN** a new conversation is created with no title and an empty message list
- **THEN** the new conversation becomes the active conversation
- **THEN** the previous conversation remains in the list, accessible via its tab

#### Scenario: New conversation defaults

- **WHEN** a new conversation is created
- **THEN** `autoFollow` is set to true
- **THEN** the manual context-note list is empty
- **THEN** the implicit context is the note currently open in the editor (if any)

### Requirement: User can switch between conversations

The system SHALL allow the user to switch the active conversation by clicking a conversation tab, restoring that conversation's full state.

#### Scenario: Switching restores conversation state

- **WHEN** the user clicks a tab for a non-active conversation B
- **THEN** the active conversation becomes B
- **THEN** the message list shows B's messages
- **THEN** B's persisted context-note selection becomes the active selection
- **THEN** B's persisted `autoFollow` flag becomes the active flag

#### Scenario: Switching does not bleed context

- **WHEN** conversation A had context notes [n1, n2] selected
- **AND** the user switches to conversation B which had `autoFollow: true` and no manual selection
- **THEN** the active context-note state is B's state, not A's

### Requirement: User can delete a conversation

The system SHALL allow the user to delete any conversation. If the deleted conversation was active, the system SHALL select another conversation as active, creating a new empty one if none remain.

#### Scenario: Delete a non-active conversation

- **WHEN** the user clicks the delete affordance on a non-active tab
- **THEN** that conversation is removed from the index and its data key
- **THEN** the active conversation is unchanged
- **THEN** the tab disappears from the tab strip

#### Scenario: Delete the active conversation

- **WHEN** the user deletes the currently active conversation
- **AND** at least one other conversation exists
- **THEN** the most recently updated remaining conversation becomes active
- **THEN** the deleted conversation's data is removed from IndexedDB

#### Scenario: Delete the only conversation

- **WHEN** the user deletes the only conversation
- **THEN** a new empty conversation is created and becomes active
- **THEN** IndexedDB no longer contains the deleted conversation's data

### Requirement: Conversations are auto-titled from their first exchange

The system SHALL generate a short title for each conversation after the first user/assistant exchange completes, by calling a server endpoint that summarizes the exchange.

#### Scenario: Title is generated after the first response

- **WHEN** a conversation has exactly one user message and one assistant response
- **AND** the conversation has no title yet
- **THEN** the client calls `POST /api/ai/title` with the messages
- **THEN** the returned title is saved to the conversation index
- **THEN** the tab updates to display the new title

#### Scenario: Title generation failure is non-blocking

- **WHEN** the title endpoint returns an error or times out
- **THEN** the conversation continues to be usable
- **THEN** the conversation remains untitled in the index
- **THEN** the tab shows a placeholder label (e.g., "Untitled")

#### Scenario: Title is not regenerated on subsequent messages

- **WHEN** a conversation already has a non-empty title
- **AND** the user sends another message
- **THEN** the title endpoint is not called
- **THEN** the existing title is preserved

### Requirement: Per-conversation context-note state is persisted

The system SHALL persist each conversation's manually selected context notes and `autoFollow` flag, so that the same selection is restored when the conversation is re-opened.

#### Scenario: Context selection persists with the conversation

- **WHEN** the user selects context notes [n1, n2] in conversation A
- **AND** the user reloads the page
- **AND** the user re-activates conversation A
- **THEN** the active context-note selection is [n1, n2]
- **THEN** the auto-follow flag matches the value last set in A

#### Scenario: Disabling auto-follow is conversation-scoped

- **WHEN** the user disables auto-follow in conversation A
- **AND** the user switches to conversation B which had auto-follow enabled
- **THEN** auto-follow is enabled while B is active
- **THEN** when the user returns to A, auto-follow is disabled again
