## ADDED Requirements

### Requirement: User can create a folder
The system SHALL allow authenticated users to create folders to organize notes.

#### Scenario: Create root folder
- **WHEN** user clicks "New Folder" in the root directory
- **THEN** system creates a new folder at the root level and refreshes the folder tree

#### Scenario: Create nested folder
- **WHEN** user clicks "New Folder" inside an existing folder
- **THEN** system creates a new folder as a child of the selected folder

### Requirement: User can rename a folder
The system SHALL allow users to rename existing folders.

#### Scenario: Successful rename
- **WHEN** user edits a folder name and confirms
- **THEN** system updates the folder name and reflects the change in the folder tree

### Requirement: User can delete a folder
The system SHALL allow users to delete empty folders.

#### Scenario: Delete empty folder
- **WHEN** user deletes a folder that contains no notes and no sub-folders
- **THEN** system removes the folder from the folder tree

#### Scenario: Prevent delete non-empty folder
- **WHEN** user attempts to delete a folder that contains notes or sub-folders
- **THEN** system prevents deletion and shows an error message

### Requirement: Folder tree displays hierarchy
The system SHALL display folders in a tree structure showing parent-child relationships.

#### Scenario: Expand/collapse folder
- **WHEN** user clicks the expand/collapse arrow next to a folder
- **THEN** system shows or hides the folder's children
