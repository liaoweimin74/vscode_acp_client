## ADDED Requirements

### Requirement: Webview 语言状态传递
SidebarProvider SHALL 在 webview 初始化时通过 initialState 传递 `vscode.env.language`，并在 VSCode 语言变更时通过 state_update 同步更新。

#### Scenario: Webview 获取当前语言
- **WHEN** webview 初始化完成
- **THEN** store 中 `locale` 值等于 `vscode.env.language`（如 "zh-cn"）

#### Scenario: VSCode 语言变更后 webview 同步
- **WHEN** 用户更改 VSCode 语言设置
- **THEN** webview 在下次 state_update 时收到新的 locale 值并更新 UI

### Requirement: Webview i18n 查找函数
Webview SHALL 提供 `t(key)` 函数，根据当前 locale 从语言包 JSON 中查找翻译文本，未找到时 fallback 到英文。

#### Scenario: 查找中文翻译
- **WHEN** locale 为 "zh-cn" 且调用 `t("prompt.placeholder.connected")`
- **THEN** 返回中文翻译文本

#### Scenario: fallback 到英文
- **WHEN** locale 为 "zh-cn" 但 key 在中文语言包中不存在
- **THEN** 返回英文语言包中该 key 的值

#### Scenario: key 完全不存在
- **WHEN** key 在所有语言包中均不存在
- **THEN** 返回 key 本身作为显示文本

### Requirement: Webview 组件字符串本地化
所有 Webview React 组件中的硬编码字符串 SHALL 替换为 `t()` 调用，包括：placeholder、button text、aria-label、title tooltip、工具标签（KIND_LABELS）、slash command 描述、提示消息等。

#### Scenario: PromptInput 显示中文 placeholder
- **WHEN** locale 为 "zh-cn" 且已连接代理
- **THEN** 输入框 placeholder 显示中文提示，如"输入消息...（/ 命令，@ 角色和文件）"

#### Scenario: SessionSelector 显示中文按钮
- **WHEN** locale 为 "zh-cn"
- **THEN** "New Session"按钮显示"新建会话"，"Clear Empty"显示"清除空会话"

#### Scenario: ToolCallCard 显示中文工具标签
- **WHEN** locale 为 "zh-cn"
- **THEN** KIND_LABELS 显示中文，如"读取"而非"Read"，"编辑"而非"Edit"

#### Scenario: AgentSelector 显示中文
- **WHEN** locale 为 "zh-cn" 且未选择代理
- **THEN** 显示"选择代理"而非"Select Agent"

#### Scenario: 错误和重连提示本地化
- **WHEN** locale 为 "zh-cn" 且连接断开
- **THEN** 显示"代理连接已断开。"和"重新连接"按钮

### Requirement: 语言包文件结构
Webview 语言包 SHALL 存放在 `src/webview/locales/` 目录下，包含 `en.json`（英文默认）、`zh-cn.json`（中文简体）、`zh-tw.json`（中文繁体），使用点分层级 key 命名。

#### Scenario: 语言包 JSON 格式正确
- **WHEN** 加载 `zh-cn.json`
- **THEN** 返回有效的 JSON 对象，key 使用点分层级如 `prompt.placeholder.connected`
