## ADDED Requirements

### Requirement: At-mention trigger
系统 SHALL 在用户在输入框中输入 `@` 字符时，弹出 AtMentionMenu 选择框。

#### Scenario: Typing @ opens menu
- **WHEN** 用户在输入框中输入 `@` 且 `@` 是新输入（非粘贴或中间位置）
- **THEN** 系统显示 AtMentionMenu 弹窗，展示角色和工具两个分组

#### Scenario: @ in middle of text
- **WHEN** 用户在已有文字后输入 `@`
- **THEN** 系统同样显示 AtMentionMenu 弹窗

### Requirement: AtMentionMenu content display
系统 SHALL 在 AtMentionMenu 中展示两个分组：角色（Roles）和工具（Tools/Slash Commands）。

#### Scenario: Both roles and commands available
- **WHEN** 当前会话有可用角色和斜杠命令
- **THEN** AtMentionMenu 显示"Roles"分组列出所有角色，"Tools"分组列出所有斜杠命令

#### Scenario: Only commands available
- **WHEN** 当前会话无可用角色（agentRoles 为空或仅1个）
- **THEN** AtMentionMenu 仅显示"Tools"分组，不显示"Roles"分组

#### Scenario: No items available
- **WHEN** 当前会话无可用角色且无斜杠命令
- **THEN** AtMentionMenu 不显示

### Requirement: Fuzzy filtering after @
系统 SHALL 支持 `@` 后输入文字进行过滤。

#### Scenario: Filter by partial text
- **WHEN** 用户输入 `@cod`
- **THEN** AtMentionMenu 仅显示名称包含 "cod" 的角色和工具（不区分大小写）

#### Scenario: No matches
- **WHEN** 用户输入 `@xyz` 且无匹配项
- **THEN** AtMentionMenu 显示空状态提示

### Requirement: Keyboard navigation
系统 SHALL 支持键盘导航 AtMentionMenu。

#### Scenario: Arrow keys
- **WHEN** AtMentionMenu 打开且用户按上/下箭头
- **THEN** 高亮项在列表中上下移动，跨分组连续导航

#### Scenario: Enter or Tab to select
- **WHEN** AtMentionMenu 打开且用户按 Enter 或 Tab
- **THEN** 选中当前高亮项并执行对应操作

#### Scenario: Escape to close
- **WHEN** AtMentionMenu 打开且用户按 Escape
- **THEN** 关闭 AtMentionMenu，保留输入框内容

### Requirement: Role selection behavior
系统 SHALL 在选择角色时切换角色并在输入框插入标记。

#### Scenario: Select a role
- **WHEN** 用户从 AtMentionMenu 中选择一个角色
- **THEN** 系统调用 `switchRole(roleId)` 切换角色，将输入框中 `@` 及过滤文字替换为 `@RoleName `，并关闭菜单

### Requirement: Tool selection behavior
系统 SHALL 在选择工具时插入斜杠命令。

#### Scenario: Select a tool
- **WHEN** 用户从 AtMentionMenu 中选择一个工具
- **THEN** 系统将输入框中 `@` 及过滤文字替换为 `/command `，并关闭菜单

### Requirement: Mutual exclusion with slash menu
系统 SHALL 确保 AtMentionMenu 和 SlashCommandMenu 互斥。

#### Scenario: @ closes slash menu
- **WHEN** SlashCommandMenu 打开时用户输入 `@`
- **THEN** SlashCommandMenu 关闭，AtMentionMenu 打开

#### Scenario: / closes at-mention menu
- **WHEN** AtMentionMenu 打开时用户输入 `/`
- **THEN** AtMentionMenu 关闭，SlashCommandMenu 打开

### Requirement: Click outside to close
系统 SHALL 在用户点击 AtMentionMenu 外部时关闭菜单。

#### Scenario: Click outside
- **WHEN** AtMentionMenu 打开且用户点击菜单外部区域
- **THEN** AtMentionMenu 关闭，保留输入框内容
