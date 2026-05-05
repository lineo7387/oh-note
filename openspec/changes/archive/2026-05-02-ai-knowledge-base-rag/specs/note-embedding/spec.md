## ADDED Requirements

### Requirement: Note embedding is generated on save
The system SHALL generate a vector embedding for a note's full text content whenever the note is created or updated.

#### Scenario: Embedding generated on note update
- **WHEN** user saves a note with title "Meeting Notes" and content blocks
- **THEN** the system extracts plain text from the content blocks
- **THEN** the system calls the embedding API with "Meeting Notes\n\n{extracted text}"
- **THEN** the resulting vector is stored in the `NoteEmbedding` table associated with the note

#### Scenario: Embedding updated on content change
- **WHEN** user edits an existing note and changes its content
- **THEN** the system deletes the old embedding for that note
- **THEN** the system generates a new embedding with the updated content
- **THEN** the new embedding is stored in the `NoteEmbedding` table

### Requirement: Embedding generation failure is non-blocking
The system SHALL NOT fail the note save operation if embedding generation fails.

#### Scenario: Embedding API unavailable
- **WHEN** user saves a note
- **AND** the embedding API returns an error or times out
- **THEN** the note is still saved successfully
- **THEN** the save operation returns success to the client
- **THEN** no new embedding is stored for that note

### Requirement: Batch backfill for existing notes
The system SHALL provide a script to generate embeddings for all existing notes that do not have one.

#### Scenario: Backfill script execution
- **WHEN** the administrator runs the backfill script
- **THEN** the script processes all notes without an embedding in batches
- **THEN** each batch is sent to the embedding API with rate limiting
- **THEN** successful embeddings are stored in the `NoteEmbedding` table
- **THEN** the script logs progress and can resume from failures

### Requirement: User data isolation for embeddings
The system SHALL ensure embeddings are only accessible for the note's owner.

#### Scenario: Cross-user embedding isolation
- **WHEN** user A has notes with embeddings
- **THEN** user B's vector search SHALL NOT retrieve user A's note embeddings
- **THEN** all embedding queries MUST include `userId` filtering
