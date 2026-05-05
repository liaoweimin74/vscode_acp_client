## ADDED Requirements

### Requirement: Display current agent role
The system SHALL display the current agent role/mode in the ConfigBar, positioned before the model selection button.

#### Scenario: Show role in ConfigBar
- **WHEN** a session is active and the agent has available modes
- **THEN** the ConfigBar SHALL show a role selector button before the model selector with the current role name

#### Scenario: Hide when no modes available
- **WHEN** the active agent has no modes or only a single mode
- **THEN** the role selector SHALL NOT be displayed

### Requirement: Switch agent role via dropdown
The system SHALL provide a dropdown menu listing all available roles when the role selector button is clicked.

#### Scenario: Open role menu
- **WHEN** user clicks the role selector button
- **THEN** a dropdown menu SHALL appear showing all available roles with the current role marked as active

#### Scenario: Select a role
- **WHEN** user clicks a role in the dropdown menu
- **THEN** the system SHALL call `setSessionMode` with the selected mode ID, and the UI SHALL update to show the new role

#### Scenario: Close on click outside
- **WHEN** the role menu is open and user clicks outside
- **THEN** the role menu SHALL close

### Requirement: Switch agent role via Ctrl+Tab
The system SHALL support switching agent roles via the `Ctrl+Tab` keyboard shortcut.

#### Scenario: Cycle to next role
- **WHEN** user presses `Ctrl+Tab` while the webview is focused
- **THEN** the system SHALL cycle to the next available role in the list (wrap around to first after last)

#### Scenario: Keyboard shortcut scope
- **WHEN** `Ctrl+Tab` is pressed outside the webview (e.g., editor area)
- **THEN** VSCode's default behavior SHALL apply (switch editor tabs)

### Requirement: Role changes reflected via session update
When a role is changed, config options may update. The system SHALL handle `config_option_update` events after a role switch.

#### Scenario: Config update after role change
- **WHEN** `setSessionMode` succeeds
- **THEN** the agent SHALL emit a config update with the new mode's available config options
- **THEN** the UI SHALL refresh config options accordingly
