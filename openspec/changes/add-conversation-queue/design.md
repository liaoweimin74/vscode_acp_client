## Context

当前vscode-acp的PromptInput组件已实现基本的排队机制（`queuedPrompts`数组），当会话正在进行中（`isStreaming === true`）时，用户发送的新消息会被加入队列。队列处理逻辑在`useStore.ts`的`sendMessage`和`stream_end`处理中：

- **入队**：`sendMessage`检测到`isStreaming`时，将prompt加入`queuedPrompts`
- **自动出队**：`stream_end`时，自动发送队列中的第一个prompt

但当前实现缺少：
1. 排队提示词的UI显示不完整（已有基础结构但缺少箭头按钮）
2. 用户无法主动中断当前会话来立即发送排队的消息
3. 缺少"向上箭头"按钮来触发中断+发送

## Goals / Non-Goals

**Goals:**
- 在提示词输入框上方显示排队中的提示词列表
- 为每个排队项添加向上箭头按钮，点击后中断当前会话并立即发送该提示词
- 保持现有的自动发送逻辑（上一轮完成后自动发送排队提示词）
- 会话发出后从队列中移除

**Non-Goals:**
- 不修改后端AgentConnection的cancel逻辑（复用现有`cancelPrompt`）
- 不添加队列重排序功能
- 不添加队列持久化（刷新页面后队列清空）

## Decisions

### 1. 复用现有cancelPrompt + sendMessage组合

**选择**：点击箭头时，先调用`cancelPrompt()`中断当前会话，然后从队列中移除该prompt并调用`sendMessage()`发送。

**理由**：
- 现有`cancelPrompt`已实现ACP `session/cancel`调用
- `sendMessage`已实现发送逻辑和状态更新
- 不需要新增后端接口

**替代方案**：
- 新增专门的`interruptAndSend(index)`方法 → 过度设计，两个现有调用组合即可

### 2. 箭头按钮位置和样式

**选择**：在每个排队项的最右侧显示向上箭头（↑），使用SVG图标。

**理由**：
- 向上箭头直观表示"提升优先级"或"立即发送"
- 与现有的移除按钮（X）并排，形成明确的功能区分

### 3. 自动发送逻辑保持不变

**选择**：`stream_end`处理保持不变，自动发送队列头部。

**理由**：
- 用户若未主动点击箭头，当前会话完成后自动发送符合预期
- 避免修改已验证的自动流程

## Risks / Trade-offs

**[Risk] 中断会话可能丢失部分Agent响应**
→ **Mitigation**: 这是用户主动行为，且Agent的`session/cancel`协议会妥善处理中断

**[Risk] 快速连续点击箭头可能导致状态不一致**
→ **Mitigation**: 箭头点击后禁用按钮，等待`isStreaming`状态更新

**[Trade-off] 队列存储在内存（Zustand store）**
→ 页面刷新后队列消失，但符合"Non-Goals"中的设计选择，简化实现
