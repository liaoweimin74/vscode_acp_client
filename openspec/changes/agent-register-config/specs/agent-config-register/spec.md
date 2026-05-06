## ADDED Requirements

### Requirement: Agent registry selection writes config without downloading
When a user selects an agent from the registry, the system SHALL write the agent's default command configuration to `vscodeAcp.agents` setting without downloading any binary files.

#### Scenario: Select npx-distributed agent
- **WHEN** user selects an agent with npx distribution from the registry
- **THEN** system SHALL write `{ id, name, command: "npx", args: [package, ...args], env? }` to `vscodeAcp.agents`

#### Scenario: Select uvx-distributed agent
- **WHEN** user selects an agent with uvx distribution from the registry
- **THEN** system SHALL write `{ id, name, command: "uvx", args: [package, ...args] }` to `vscodeAcp.agents`

#### Scenario: Select binary-distributed agent
- **WHEN** user selects an agent with binary distribution from the registry
- **THEN** system SHALL write `{ id, name, command: binary.cmd, args: binary.args }` to `vscodeAcp.agents` without downloading the archive

### Requirement: Confirmation dialog before adding config
The system SHALL show a confirmation dialog before adding the agent configuration.

#### Scenario: User confirms adding agent
- **WHEN** user selects an available agent and confirms the "Add" dialog
- **THEN** system SHALL write the agent config to `vscodeAcp.agents`

#### Scenario: User cancels adding agent
- **WHEN** user selects an available agent and cancels the dialog
- **THEN** system SHALL NOT modify `vscodeAcp.agents`

### Requirement: Overwrite confirmation for existing agent
The system SHALL prompt for overwrite confirmation when the selected agent already exists in configuration.

#### Scenario: Agent already configured, user overwrites
- **WHEN** user selects an agent whose id already exists in `vscodeAcp.agents` and confirms overwrite
- **THEN** system SHALL replace the existing agent config with the new one

#### Scenario: Agent already configured, user declines overwrite
- **WHEN** user selects an agent whose id already exists in `vscodeAcp.agents` and declines overwrite
- **THEN** system SHALL NOT modify `vscodeAcp.agents`

### Requirement: Auto-connect after config registration
After successfully adding the agent config, the system SHALL attempt to connect to the agent.

#### Scenario: Successful connection after registration
- **WHEN** agent config is added and connection succeeds
- **THEN** system SHALL set the agent as active, create a session, and show the sidebar

#### Scenario: Connection fails after registration
- **WHEN** agent config is added but connection fails
- **THEN** system SHALL show an error message and keep the agent in configuration

### Requirement: Platform availability check preserved
The system SHALL continue to check and display platform availability for agents in the quick pick list.

#### Scenario: Agent not available for platform
- **WHEN** user selects an agent that is not available for the current platform
- **THEN** system SHALL show a warning message and NOT add the config
