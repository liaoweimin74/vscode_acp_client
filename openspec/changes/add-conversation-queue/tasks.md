## 1. 前端状态管理扩展

- [ ] 1.1 在 `useStore.ts` 中新增 `interruptAndSend(index: number)` 方法：调用 `cancelPrompt()`，然后从 `queuedPrompts` 中移除指定项，最后调用 `sendMessage(prompt)` 发送该提示词

## 2. PromptInput UI 修改

- [ ] 2.1 修改 `PromptInput.tsx` 中排队提示词的渲染逻辑：为每个排队项添加向上箭头按钮（↑），位于移除按钮（X）的左侧
- [ ] 2.2 箭头按钮点击时调用 `interruptAndSend(i)` 方法
- [ ] 2.3 箭头按钮添加适当 title/aria-label（如 "Interrupt and send"）

## 3. 样式添加

- [ ] 3.1 在 `PromptInput.css` 中添加 `.acp-prompt__queue-send` 样式：与 `.acp-prompt__queue-remove` 类似，但使用向上箭头 SVG
- [ ] 3.2 添加箭头按钮的 hover 效果，颜色变为 accent 色以示区分

## 4. 验证与测试

- [ ] 4.1 构建验证：`npm run build:all` 无错误
- [ ] 4.2 手动测试：会话进行中发送新消息 → 排队项显示 → 点击箭头 → 中断并立即发送
- [ ] 4.3 手动测试：会话进行中发送多条消息 → 排队列表显示所有消息 → 点击第一条的箭头 → 中断并发送第一条
- [ ] 4.4 手动测试：不点击箭头，等待会话完成 → 排队消息自动发送
