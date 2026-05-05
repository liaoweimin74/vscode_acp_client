## 1. Shared Utils

- [x] 1.1 Create `src/shared/utils.ts` with `flattenSelectOptions` function (handles grouped/ungrouped/empty)
- [x] 1.2 Update `src/extension/commands/selectModel.ts` to import from `@shared/utils` and remove local `flattenSelectOptions`
- [x] 1.3 Update `src/extension/commands/setThoughtLevel.ts` to import from `@shared/utils` and remove local `flattenSelectOptions`
- [x] 1.4 Update `src/webview/components/ConfigBar.tsx` to import from `@shared/utils` and remove local `flattenOptions`

## 2. Structured Logging

- [x] 2.1 Create `src/extension/Logger.ts` with Logger class (debug/info/warn/error levels, OutputChannel backend, configurable level)
- [x] 2.2 Add `vscodeAcp.logLevel` configuration to `package.json` contributes.configuration
- [x] 2.3 Replace all `console.log` in `AgentConnection.ts` with `Logger.info()` or `Logger.debug()`
- [x] 2.4 Replace all `console.error` in `AgentConnection.ts` with `Logger.error()`
- [x] 2.5 Replace `console.log` in `StateManager.ts`, `SidebarProvider.ts`, `newSession.ts` with Logger calls
- [x] 2.6 Initialize Logger in `index.ts` activation and dispose on deactivation

## 3. Auto Reconnect

- [x] 3.1 Add `_reconnecting` and `_reconnectAttempts` state to `AgentConnection`
- [x] 3.2 Implement `attemptReconnect()` method with exponential backoff (1s, 2s, 4s) and max 3 retries
- [x] 3.3 Call `attemptReconnect()` from process exit handler when `!_disconnecting && code !== 0`
- [x] 3.4 Cancel reconnect on manual `disconnect()` call
- [x] 3.5 Add `reconnecting` and `reconnectFailed` events to `AgentConnectionEvents`
- [x] 3.6 Forward reconnect events from `SidebarProvider` to webview
- [x] 3.7 Handle `reconnect_failed` in webview store — show reconnect button

## 4. Slash Commands

- [x] 4.1 Create `src/extension/SlashCommandRegistry.ts` with register/list/execute interface
- [x] 4.2 Register built-in commands: `/model`, `/think`, `/agent`, `/clear` in `index.ts`
- [x] 4.3 Add `slash_command` message type to `src/shared/types/extension.ts`
- [x] 4.4 Parse slash commands in webview `ChatInput.tsx` before sending — emit structured message
- [x] 4.5 Handle `slash_command` messages in `SidebarProvider.handleWebviewMessage()`
- [x] 4.6 Send available commands list to webview on agent connect
- [x] 4.7 Handle unknown command — show error in webview

## 5. Syntax Highlighting

- [x] 5.1 Install `highlight.js` as webview dependency
- [x] 5.2 Create `src/webview/highlight.ts` with core import + selective language registration (ts, js, python, rust, go, bash, json, css, html, md, yaml, xml)
- [x] 5.3 Update `CodeBlock.tsx` to use `hljs.highlight()` for rendering
- [x] 5.4 Add highlight.js CSS theme import (dark/light based on VSCode theme)
- [x] 5.5 Verify copy button still copies plain text (not HTML)

## 6. Markdown Rendering

- [x] 6.1 Install `react-markdown` and `remark-gfm` as webview dependencies
- [x] 6.2 Rewrite `MessageItem.tsx` to use `<ReactMarkdown>` with remark-gfm plugin
- [x] 6.3 Configure react-markdown code block renderer to use `CodeBlock` component
- [x] 6.4 Remove `extractCodeBlocks` function from `MessageItem.tsx`
- [x] 6.5 Add Markdown CSS styles for headings, lists, links, tables, blockquotes, inline code
- [x] 6.6 Add dark/light theme CSS variable support for Markdown elements

## 7. SubAgentView Fix

- [x] 7.1 Replace "Sub-agent conversation loading..." with "Sub-agent conversations are not yet supported" placeholder text
- [x] 7.2 Update SubAgentView styling to visually distinguish "not available" state from "loading" state
