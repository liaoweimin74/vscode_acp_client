## ADDED Requirements

### Requirement: Code block syntax highlighting
代码块 SHALL 使用 highlight.js 进行语法高亮渲染。

#### Scenario: Code block with language tag
- **WHEN** Markdown 代码块指定了语言（如 ` ```typescript `）
- **THEN** 使用 highlight.js 按指定语言高亮渲染

#### Scenario: Code block without language tag
- **WHEN** Markdown 代码块未指定语言
- **THEN** 使用 highlight.js 自动检测语言并高亮

#### Scenario: Highlight.js theme integration
- **WHEN** 代码块渲染时
- **THEN** 使用与 VSCode 主题协调的 highlight.js 主题（深色主题用 dark 主题，浅色主题用 light 主题）

### Requirement: Highlight.js bundle optimization
SHALL 使用按需加载方式引入 highlight.js 以控制打包体积。

#### Scenario: Core + selective language registration
- **WHEN** 构建打包时
- **THEN** 仅注册常用语言（typescript, javascript, python, rust, go, bash, json, css, html, markdown, yaml, xml），不引入全量语言包

### Requirement: Code block copy functionality preserved
语法高亮 SHALL 保留现有的复制功能。

#### Scenario: Copy highlighted code
- **WHEN** 用户点击代码块复制按钮
- **THEN** 复制纯文本代码（不含高亮 HTML 标签）
