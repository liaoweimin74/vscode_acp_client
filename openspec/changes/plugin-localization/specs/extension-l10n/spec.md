## ADDED Requirements

### Requirement: package.json NLS 占位符支持
package.json 中 commands 的 title 和 configuration properties 的 title/description SHALL 使用 `%key%` 占位符语法，配合 `package.nls.json`（英文默认）和 `package.nls.zh-cn.json`（中文简体）提供本地化文本。

#### Scenario: VSCode 显示中文命令标题
- **WHEN** VSCode 语言设置为 zh-cn
- **THEN** 命令面板中显示中文命令标题，如"ACP: 选择代理"而非"ACP: Select Agent"

#### Scenario: VSCode 显示英文命令标题（默认回退）
- **WHEN** VSCode 语言设置为 en 或未匹配的语言
- **THEN** 命令面板中显示英文命令标题

### Requirement: Extension Host 字符串本地化
Extension Host 侧所有用户可见字符串 SHALL 使用 `vscode.l10n.t()` 替换硬编码英文，包括：QuickPick title/placeholder、withProgress title、showInformationMessage/showWarningMessage/showErrorMessage 消息文本、StatusBar tooltip。

#### Scenario: 连接代理时显示中文进度提示
- **WHEN** VSCode 语言为 zh-cn 且用户连接代理
- **THEN** 状态栏显示中文进度提示，如"正在连接 OpenCode..."

#### Scenario: 切换思考级别后显示中文确认消息
- **WHEN** VSCode 语言为 zh-cn 且用户切换思考级别
- **THEN** 显示中文信息提示，如"思考级别已设置为 high"

#### Scenario: 错误消息本地化
- **WHEN** VSCode 语言为 zh-cn 且代理连接失败
- **THEN** 显示中文错误消息

### Requirement: StatusBar 文本本地化
StatusBar 的 text 和 tooltip SHALL 根据当前语言显示本地化文本。

#### Scenario: 无代理时显示中文状态
- **WHEN** VSCode 语言为 zh-cn 且未选择代理
- **THEN** StatusBar 显示"无代理"而非"No Agent"

### Requirement: Discover Agents 流程本地化
发现代理的完整流程（进度提示、QuickPick、安装确认、成功/失败消息）SHALL 全部本地化。

#### Scenario: 安装确认对话框显示中文
- **WHEN** VSCode 语言为 zh-cn 且用户选择安装代理
- **THEN** 确认对话框显示中文，如"安装 OpenCode v0.1.0？"

#### Scenario: 平台不可用提示本地化
- **WHEN** VSCode 语言为 zh-cn 且代理不支持当前平台
- **THEN** 显示中文警告消息
