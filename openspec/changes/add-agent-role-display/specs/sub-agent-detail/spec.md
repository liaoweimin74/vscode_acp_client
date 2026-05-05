## ADDED Requirements

### Requirement: Sub-agent messages stored in Message
The `Message` type SHALL support a `subAgentMessages` field containing the full list of sub-agent conversation messages.

#### Scenario: Message with sub-agent content
- **WHEN** an assistant message contains sub-agent execution results
- **THEN** the message SHALL include a `subAgentMessages` array with `Message[]` representing the sub-agent's conversation

### Requirement: Sub-agent view collapsed by default
The SubAgentView component SHALL display sub-agent information in a collapsed state by default.

#### Scenario: Render collapsed state
- **WHEN** a message has `subAgentMessages` with one or more entries
- **THEN** the SubAgentView SHALL render as a collapsed card showing the sub-agent ID/name and a dropdown arrow icon

#### Scenario: Expand on click
- **WHEN** user clicks the sub-agent card header or the dropdown arrow
- **THEN** the card SHALL expand to show the full sub-agent conversation messages

#### Scenario: Collapse on second click
- **WHEN** user clicks the expanded sub-agent card header or dropdown arrow
- **THEN** the card SHALL collapse back to the header-only state

### Requirement: Sub-agent messages rendered as read-only chat
When expanded, sub-agent messages SHALL be rendered in a read-only chat-like format with user and assistant turns.

#### Scenario: Render sub-agent conversation
- **WHEN** the sub-agent card is expanded
- **THEN** each message in `subAgentMessages` SHALL be rendered with role label, content, and timestamp in a compact nested view

#### Scenario: Nested sub-agents
- **WHEN** a sub-agent message itself contains `subAgentMessages`
- **THEN** those nested sub-agent messages SHALL also be rendered as collapsed SubAgentViews (recursive)
