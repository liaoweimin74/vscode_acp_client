## ADDED Requirements

### Requirement: Full Markdown rendering
消息内容 SHALL 使用 react-markdown + remark-gfm 进行完整 Markdown 渲染。

#### Scenario: Headings rendering
- **WHEN** 消息内容包含 `# Title` 或 `## Subtitle`
- **THEN** 渲染为对应级别的 HTML 标题元素

#### Scenario: Bold and italic rendering
- **WHEN** 消息内容包含 `**bold**` 或 `*italic*`
- **THEN** 渲染为 `<strong>` 和 `<em>` 元素

#### Scenario: Links rendering
- **WHEN** 消息内容包含 `[text](url)`
- **THEN** 渲染为可点击的 `<a>` 元素，外部链接在新标签页打开

#### Scenario: Lists rendering
- **WHEN** 消息内容包含有序或无序列表
- **THEN** 渲染为 `<ol>` 或 `<ul>` 元素

#### Scenario: Inline code rendering
- **WHEN** 消息内容包含 `` `code` ``
- **THEN** 渲染为 `<code>` 元素，带行内代码样式

#### Scenario: GFM tables rendering
- **WHEN** 消息内容包含 GFM 表格语法
- **THEN** 渲染为 `<table>` 元素

#### Scenario: Blockquotes rendering
- **WHEN** 消息内容包含 `> quote`
- **THEN** 渲染为 `<blockquote>` 元素

### Requirement: Code blocks use CodeBlock component
react-markdown 渲染代码块时 SHALL 使用现有的 `CodeBlock` 组件（含语法高亮和复制功能）。

#### Scenario: Code block integration
- **WHEN** react-markdown 遇到 fenced code block
- **THEN** 使用 `CodeBlock` 组件渲染，传入 `code` 和 `language` 属性

### Requirement: Remove extractCodeBlocks function
`MessageItem.tsx` 中的 `extractCodeBlocks` 函数 SHALL 被移除，由 react-markdown 接管所有内容渲染。

#### Scenario: Message rendering flow
- **WHEN** MessageItem 渲染消息内容
- **THEN** 直接将 `content` 传给 `<ReactMarkdown>` 组件，不再手动拆分 code/text 块

### Requirement: Markdown styling
Markdown 渲染元素 SHALL 有适当的 CSS 样式，与 VSCode 主题协调。

#### Scenario: Dark theme styling
- **WHEN** VSCode 使用深色主题
- **THEN** Markdown 元素使用深色调色板

#### Scenario: Light theme styling
- **WHEN** VSCode 使用浅色主题
- **THEN** Markdown 元素使用浅色调色板
