## ADDED Requirements

### Requirement: User can create a note
The system SHALL allow authenticated users to create new notes within folders.

#### Scenario: Create note in folder
- **WHEN** user clicks "New Note" while a folder is selected
- **THEN** system creates a new note with a default title in the selected folder and opens it in the editor

### Requirement: User can edit a note title
The system SHALL allow users to rename notes.

#### Scenario: Rename note
- **WHEN** user edits a note title in the note list or editor header
- **THEN** system updates the note title and persists the change

### Requirement: User can move a note between folders
The system SHALL allow users to move notes from one folder to another.

#### Scenario: Move note via drag and drop
- **WHEN** user drags a note from one folder to another in the folder tree
- **THEN** system updates the note's folder association and refreshes both folders' contents

### Requirement: User can delete a note
The system SHALL allow users to permanently delete notes.

#### Scenario: Delete note
- **WHEN** user confirms deletion of a note
- **THEN** system removes the note and its content from the database

### Requirement: Note list shows notes in selected folder
The system SHALL display a list of notes belonging to the currently selected folder.

#### Scenario: Select folder shows notes
- **WHEN** user selects a folder in the folder tree
- **THEN** system displays all notes within that folder, sorted by last updated time descending
