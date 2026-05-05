## 1. Shared Types & Protocol Layer

- [x] 1.1 Add `AgentRole` type (`id: string`, `name: string`) and `activeRole: string | null` to extension types
- [x] 1.2 Add `subAgentMessages?: Message[]` field to `Message` type
- [x] 1.3 Add `role_update` and `agent_roles` message types to `ExtensionMessage`
- [x] 1.4 Add `switch_role` and `get_agent_roles` message types to `WebviewMessage`
- [x] 1.5 Update `ExtensionState` to include `agentRoles` and `activeRole`

## 2. Store & State Management

- [x] 2.1 Add `agentRoles`, `activeRole`, `switchRole`, `setAgentRoles` to zustand store
- [x] 2.2 Handle `state_update` with new role fields in the store's message handler
- [x] 2.3 Update `ExtensionState` initial values in store

## 3. Role Selector UI Component

- [x] 3.1 Create `RoleSelector.tsx` with button showing current role name
- [x] 3.2 Add dropdown menu listing all available roles with active indicator
- [x] 3.3 Add `RoleSelector.css` with styles matching ConfigBar styling
- [x] 3.4 Integrate `RoleSelector` into `ConfigBar.tsx` before model selector

## 4. Ctrl+Tab Keyboard Shortcut

- [x] 4.1 Register `vscodeAcp.selectAgentRole` command in `package.json`
- [x] 4.2 Add `Ctrl+Tab` keybinding in `package.json` with `when` clause for webview focus
- [x] 4.3 Create `selectAgentRole.ts` command in `src/extension/commands/`
- [x] 4.4 Wire command through extension activation in `index.ts`
- [x] 4.5 Implement cycle logic: get current role index → select next (wrap around)

## 5. Sub-Agent Detail View

- [x] 5.1 Update `SubAgentView.tsx` to accept `subAgentMessages` prop
- [x] 5.2 Replace placeholder with real sub-agent message rendering
- [x] 5.3 Add recursive support for nested sub-agent messages
- [x] 5.4 Update `SubAgentView.css` with compact chat-like styling
- [x] 5.5 Update `MessageItem.tsx` to pass `subAgentMessages` to `SubAgentView`

## 6. Extension Host Wiring

- [x] 6.1 Forward role/mode data from ACP `InitializeResponse` to webview state
- [x] 6.2 Handle `switch_role` message in `WebviewBridge` → call `setSessionMode`
- [x] 6.3 Handle mode change events and propagate role updates to webview
- [x] 6.4 Register `selectAgentRole` in `registerCommands`
