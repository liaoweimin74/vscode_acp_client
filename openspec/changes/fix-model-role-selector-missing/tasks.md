## 1. Fix connectAgent atomic state update

- [x] 1.1 Wrap `setActiveAgent` + `setConfigOptions` + `update({ agentRoles })` in `state.batch()` in `connectAgent.ts`, ensuring only one `onDidChange` fires after all data is set
- [x] 1.2 Same fix in `selectAgent.ts` — wrap the entire post-connect state mutation sequence in `state.batch()`

## 2. Fix pushState to not overwrite existing values

- [x] 2.1 In `SidebarProvider.pushState()`, modify the `else if (activeAgent)` branch: when `pendingSessionId` is null and state already has non-empty `configOptions`/`agentRoles`, skip overwriting them
- [x] 2.2 In `SidebarProvider.pushState()`, when `pendingSessionId` exists, only supplement empty `configOptions`/`agentRoles` from pending session data (don't overwrite if already set)

## 3. Fix newSession to restore configOptions/agentRoles

- [x] 3.1 In `newSession.ts`, after clearing `activeSession`/`configOptions`/`agentRoles`, call `createPendingSession` and restore `configOptions` and `agentRoles` from the result, all within a `state.batch()`
- [x] 3.2 Handle `createPendingSession` failure gracefully — leave configOptions/agentRoles empty but don't crash

## 4. Verify and test

- [x] 4.1 Build with `npm run build:all` and verify no errors
- [ ] 4.2 Test manually: connect to opencode agent, verify model selector and role selector appear immediately
- [ ] 4.3 Test manually: click "New Session", verify selectors remain visible
