## ADDED Requirements

### Requirement: Atomic state update on agent connect
The system SHALL perform all state mutations during agent connection (setActiveAgent, setConfigOptions, update agentRoles) within a single `state.batch()` call, ensuring the webview receives exactly one `state_update` message containing complete data (non-empty configOptions and agentRoles when available from the agent).

#### Scenario: Agent connect with models and modes
- **WHEN** user connects to an agent that returns configOptions and modes in `createPendingSession`
- **THEN** the webview receives a single `state_update` with `configOptions` containing the model option and `agentRoles` containing the available modes
- **AND** no intermediate `state_update` with empty `configOptions` or `agentRoles` is sent

#### Scenario: Agent connect without modes
- **WHEN** user connects to an agent that returns configOptions but no modes
- **THEN** the webview receives `state_update` with `configOptions` populated and `agentRoles` as empty array
- **AND** the model selector is visible, the role selector is hidden

### Requirement: pushState preserves existing configOptions and agentRoles when no active session
When `pushState()` is called with `activeSession=null` and `activeAgent` set, it SHALL NOT overwrite non-empty `configOptions` or `agentRoles` with empty values. It SHALL only supplement empty fields from the pending session if available.

#### Scenario: pushState after connectAgent set configOptions
- **WHEN** `connectAgent` has set `configOptions` via `setConfigOptions` and `pushState` is subsequently called
- **AND** `activeSession` is null and `pendingSessionId` is null (already consumed)
- **THEN** `pushState` SHALL preserve the existing `configOptions` and `agentRoles` without overwriting them

#### Scenario: pushState with pending session available
- **WHEN** `pushState` is called with `activeSession=null`, `activeAgent` set, and `pendingSessionId` available
- **AND** `configOptions` is empty
- **THEN** `pushState` SHALL populate `configOptions` from the pending session's data

### Requirement: newSession restores configOptions and agentRoles
The `newSession` command SHALL, after clearing the active session, immediately create a new pending session and restore `configOptions` and `agentRoles` from it within the same batch, so the model selector and role selector remain visible.

#### Scenario: User creates new session
- **WHEN** user triggers "New Session" while connected to an agent
- **THEN** the active session is cleared and a new pending session is created
- **AND** `configOptions` and `agentRoles` are restored from the new pending session
- **AND** the model selector and role selector remain visible in the webview

#### Scenario: newSession fails to create pending session
- **WHEN** user triggers "New Session" and `createPendingSession` throws an error
- **THEN** `configOptions` and `agentRoles` are cleared
- **AND** the webview shows the session as empty but does not crash
