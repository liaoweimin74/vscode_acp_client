## 1. SlashCommandRegistry 扩展

- [ ] 1.1 在 `SlashCommand` 接口中增加 `builtin?: boolean` 字段
- [ ] 1.2 修改 `SlashCommandRegistry.execute()` 返回值，增加 `builtin?: boolean` 字段，当命令的 `builtin` 为 true 且执行成功时返回 `builtin: true`

## 2. SidebarProvider 适配

- [ ] 2.1 修改 `SidebarProvider.handleWebviewMessage` 中 `slash_command` 分支，当 `result.success && result.builtin` 时不 fallback 到 agent

## 3. /sessions 内置命令

- [ ] 3.1 在 `src/extension/index.ts` 中注册 `/sessions` 内置命令，执行逻辑：获取所有 sessions，弹出 QuickPick，用户选择后切换会话
- [ ] 3.2 切换会话前确保当前状态已持久化（调用 `state.persist()` 或通过 `update` 触发）

## 4. /models 内置命令

- [ ] 4.1 在 `src/extension/index.ts` 中注册 `/models` 内置命令，执行逻辑：获取当前 session 的 model configOptions，弹出 QuickPick，用户选择后调用 `setConfigOption`

## 5. 验证

- [ ] 5.1 编译通过（`npm run build`）
- [ ] 5.2 手动测试 `/sessions` 和 `/models` 命令
