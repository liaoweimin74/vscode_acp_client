## ADDED Requirements

### Requirement: Add agent config from registry without download
The system SHALL allow users to select an agent from the registry and add its default launch configuration (command, args, env) to `vscodeAcp.agents` without downloading or installing any files.

#### Scenario: User selects an available agent
- **WHEN** user runs "ACP: Discover Agents" command and selects an agent that is available for their platform
- **THEN** the system SHALL show a confirmation dialog with "Add to Configuration" action
- **AND** upon confirmation, the system SHALL write the agent's default config (id, name, command, args, env) to `vscodeAcp.agents` in global settings
- **AND** the system SHALL NOT download, extract, or install any files

#### Scenario: User selects an agent not available for their platform
- **WHEN** user selects an agent that is not available for their platform
- **THEN** the system SHALL show a warning that the agent may not work on the current platform
- **AND** the system SHALL still allow the user to add the configuration if they confirm

#### Scenario: Agent already exists in configuration
- **WHEN** user selects an agent whose id already exists in `vscodeAcp.agents`
- **THEN** the system SHALL show a warning asking whether to overwrite the existing configuration
- **AND** upon confirmation, the system SHALL replace the existing agent config with the new one

#### Scenario: Agent added successfully
- **WHEN** the agent config is successfully written to settings
- **THEN** the system SHALL show an information message indicating the agent was added
- **AND** the system SHALL NOT automatically connect to the agent

### Requirement: Remove download and installation code
The system SHALL remove all agent download, extraction, and binary installation code from the `discoverAgents` command, including `downloadAndExtractBinary`, `extractArchive`, `findBinary`, `execFileAsync`, and `getAgentDir` functions.

#### Scenario: No download code remains
- **WHEN** the `discoverAgents` command is invoked
- **THEN** no file download, archive extraction, or binary search operations SHALL occur

### Requirement: Binary distribution command handling
For agents with binary distribution, the system SHALL use the binary's `cmd` field as the command value in the configuration, stripping any leading `./` prefix.

#### Scenario: Binary cmd with relative path prefix
- **WHEN** an agent has binary distribution with cmd value like `./bin/agent` or `.\\agent.exe`
- **THEN** the system SHALL strip the `./` or `.\\` prefix and use `bin/agent` or `agent.exe` as the command value
