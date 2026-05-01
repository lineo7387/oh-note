## ADDED Requirements

### Requirement: AI assistant appears as floating bubble
The system SHALL display the AI assistant as a floating button in the bottom-right corner when collapsed.

#### Scenario: Default collapsed state
- **WHEN** user opens a note in the editor
- **THEN** system shows the AI assistant as a floating bubble in the bottom-right corner

#### Scenario: Expand AI sidebar
- **WHEN** user clicks the floating AI bubble
- **THEN** system expands the AI assistant into a 320px sidebar on the right, and the editor area shrinks to accommodate it

#### Scenario: Collapse AI sidebar
- **WHEN** user clicks the close button or the AI bubble again while expanded
- **THEN** system collapses the AI assistant back to the floating bubble

### Requirement: AI assistant streams responses
The system SHALL stream AI responses in real-time using Server-Sent Events.

#### Scenario: Send message and receive streaming response
- **WHEN** user sends a message in the AI sidebar
- **THEN** system streams the DeepSeek API response word-by-word into the chat interface

### Requirement: AI assistant uses current note as context
The system SHALL inject the currently open note's content into the AI conversation context.

#### Scenario: AI answers based on current note
- **WHEN** user asks a question in the AI sidebar while a note is open
- **THEN** system includes the note's title and text content in the system prompt, and the AI's answer references the note content

#### Scenario: AI context updates on note switch
- **WHEN** user switches to a different note
- **THEN** system updates the AI context to use the newly opened note's content for subsequent messages

### Requirement: AI assistant handles empty notes gracefully
The system SHALL allow AI conversation even when the current note has no content.

#### Scenario: Chat with empty note
- **WHEN** user opens a new empty note and sends a message to the AI
- **THEN** system informs the AI that the note is empty and responds based on the user's question alone

### Requirement: AI sidebar persists expansion state
The system SHALL remember the user's preferred AI sidebar state across page reloads.

#### Scenario: Remember sidebar state
- **WHEN** user expands or collapses the AI sidebar
- **THEN** system stores the preference in localStorage and restores it on the next visit
