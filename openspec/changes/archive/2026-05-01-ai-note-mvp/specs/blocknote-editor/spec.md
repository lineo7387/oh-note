## ADDED Requirements

### Requirement: Editor supports block-based editing
The system SHALL provide a WYSIWYG editor that organizes content into discrete blocks.

#### Scenario: Create paragraph block
- **WHEN** user types text in the editor
- **THEN** system creates a paragraph block containing the typed text

#### Scenario: Create heading block
- **WHEN** user types "# " at the beginning of a line
- **THEN** system converts the current block to a heading block

#### Scenario: Create list block
- **WHEN** user types "- " or "1. " at the beginning of a line
- **THEN** system converts the current block to a bullet or numbered list item

#### Scenario: Create code block
- **WHEN** user inserts a code block via slash command
- **THEN** system creates a code block with syntax highlighting support

### Requirement: Editor content persists automatically
The system SHALL automatically save note content as the user types.

#### Scenario: Auto-save on content change
- **WHEN** user edits note content in the editor
- **THEN** system persists the updated BlockNote JSON to the database after a debounce period

### Requirement: Editor loads existing note content
The system SHALL populate the editor with the stored content when opening an existing note.

#### Scenario: Open existing note
- **WHEN** user selects a note from the note list
- **THEN** system loads the note's BlockNote JSON content into the editor

### Requirement: Editor provides slash commands
The system SHALL allow users to insert blocks via slash commands.

#### Scenario: Use slash command
- **WHEN** user types "/" in the editor
- **THEN** system displays a menu of available block types and formatting options
