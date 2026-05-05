## ADDED Requirements

### Requirement: Builtin command distinction
The system SHALL support a `builtin` flag on slash commands. When a builtin command executes successfully, the system SHALL NOT fallback to sending the command as a prompt to the agent.

#### Scenario: Builtin command executes successfully
- **WHEN** user types `/sessions` and the builtin `/sessions` command executes successfully
- **THEN** the command is handled locally and NOT sent to the agent

#### Scenario: Non-builtin command not found
- **WHEN** user types `/unknown` and no slash command is registered for it
- **THEN** the command text IS sent to the agent as a prompt

### Requirement: /sessions command
The system SHALL provide a builtin `/sessions` slash command that displays a QuickPick list of all sessions. The QuickPick SHALL show session title, agent ID, message count, and last updated time. When the user selects a session, the system SHALL persist the current session state and then switch to the selected session.

#### Scenario: Sessions available
- **WHEN** user types `/sessions` and there are existing sessions
- **THEN** a QuickPick appears showing all sessions with title, agentId, message count, and updatedAt

#### Scenario: User selects a session
- **WHEN** user selects a session from the QuickPick
- **THEN** the current session state is persisted, and the active session switches to the selected one

#### Scenario: No sessions available
- **WHEN** user types `/sessions` and there are no sessions
- **THEN** an information message "No sessions available. Create one first." is shown

#### Scenario: User cancels QuickPick
- **WHEN** user dismisses the QuickPick without selecting
- **THEN** no session switch occurs

### Requirement: /models command
The system SHALL provide a builtin `/models` slash command that displays a QuickPick list of available models for the current session. The QuickPick SHALL mark the currently active model. When the user selects a model, the system SHALL call `setConfigOption` to switch to the selected model.

#### Scenario: Models available
- **WHEN** user types `/models` and the current session has model config options
- **THEN** a QuickPick appears showing all available models with the current model marked

#### Scenario: User selects a model
- **WHEN** user selects a model from the QuickPick
- **THEN** `setConfigOption` is called with the selected model value and a confirmation message is shown

#### Scenario: No active session
- **WHEN** user types `/models` and there is no active session
- **THEN** a warning message "No active session." is shown

#### Scenario: Agent not connected
- **WHEN** user types `/models` and the agent is not connected
- **THEN** an error message "Agent is not connected." is shown

#### Scenario: Model selection not available
- **WHEN** user types `/models` and the agent does not support model selection
- **THEN** an information message "Model selection not available for this agent." is shown

#### Scenario: User cancels QuickPick
- **WHEN** user dismisses the QuickPick without selecting
- **THEN** no model change occurs
