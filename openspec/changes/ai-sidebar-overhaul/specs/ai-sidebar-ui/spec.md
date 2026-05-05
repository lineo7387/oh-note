## ADDED Requirements

### Requirement: Sidebar width is user-resizable

The system SHALL allow the user to resize the AI sidebar horizontally by dragging its left edge, within a clamped range, and SHALL persist the chosen width across reloads.

#### Scenario: Drag from the left edge resizes the panel

- **WHEN** the user presses on the resize handle on the sidebar's left edge
- **AND** drags horizontally
- **THEN** the sidebar width updates in real time to follow the pointer
- **THEN** the width is clamped to a minimum of 280 pixels and a maximum of 720 pixels

#### Scenario: Width is persisted across reloads

- **WHEN** the user finishes a resize at width W
- **THEN** W is saved to localStorage under `ui:sidebar-width`
- **WHEN** the user reloads the page
- **THEN** the sidebar opens at width W (still clamped to the current viewport)

#### Scenario: First-time visitor sees the default width

- **WHEN** the sidebar opens for the first time on a device
- **AND** localStorage has no `ui:sidebar-width` value
- **THEN** the sidebar width is the default of 320 pixels

#### Scenario: Drag does not interfere with text selection

- **WHEN** the user is dragging the resize handle
- **THEN** text selection is suppressed for the duration of the drag
- **WHEN** the drag ends
- **THEN** text selection is re-enabled

### Requirement: Conversation tabs are displayed at the top of the sidebar

The system SHALL display a horizontal, scrollable conversation tab strip at the top of the AI sidebar, with one tab per conversation, an indicator for the active tab, and a trailing button to create a new conversation.

#### Scenario: Tab strip shows all conversations in order

- **WHEN** the user has N conversations
- **THEN** the tab strip displays N tabs ordered most-recently-updated first
- **THEN** each tab displays the conversation's title (or a placeholder if untitled)
- **THEN** the active conversation's tab is visually distinguished

#### Scenario: Long titles are truncated

- **WHEN** a conversation title exceeds the tab's available width
- **THEN** the title is truncated with an ellipsis
- **THEN** the full title is available via a tooltip on hover

#### Scenario: Many tabs scroll horizontally

- **WHEN** the total tab width exceeds the sidebar width
- **THEN** the tab strip becomes horizontally scrollable
- **THEN** the `+` button remains accessible at the trailing end

### Requirement: Each tab exposes a delete affordance

The system SHALL allow the user to delete a conversation directly from its tab.

#### Scenario: Hovering reveals delete button

- **WHEN** the user hovers over a conversation tab
- **THEN** a delete affordance (e.g., `×` icon) appears on that tab
- **WHEN** the user clicks the delete affordance
- **THEN** the conversation is deleted (per the ai-conversations capability)

#### Scenario: Delete button does not trigger tab activation

- **WHEN** the user clicks the delete affordance on a non-active tab
- **THEN** that conversation is deleted
- **THEN** the active conversation does not change to the clicked tab

### Requirement: Sidebar shows a "thinking" indicator during tool execution

The system SHALL display a visible indicator while the AI is executing tool calls, separating that state from the streaming-response state.

#### Scenario: Indicator shown while tools execute

- **WHEN** the user submits a question that causes the AI to invoke a tool
- **THEN** the sidebar shows a "thinking" indicator after the user message
- **THEN** no streamed assistant text appears yet

#### Scenario: Indicator hidden once streaming begins

- **WHEN** the AI's tool-calling loop completes and the final assistant response begins streaming
- **THEN** the "thinking" indicator is replaced by the streamed assistant message
