## Why

插件所有界面文本（命令标题、提示信息、按钮标签、placeholder、错误消息等）均为硬编码英文，无法根据 VSCode 语言设置自动切换。需要增加本地化（i18n）支持，使中文用户等非英语用户获得母语体验。

## What Changes

- 新增 i18n 基础设施：语言包文件（JSON）、翻译查找函数、语言切换响应机制
- Extension Host 侧：使用 `vscode.l10n` API（VSCode 1.85+ 内置）替换所有硬编码字符串（命令标题、进度提示、QuickPick 标题、showInformationMessage/showWarningMessage/showErrorMessage 消息、StatusBar 文本）
- Webview 侧：通过 postMessage 将当前语言传递给 webview，webview 内使用 i18n 查找函数替换所有硬编码字符串（placeholder、按钮文本、aria-label、tooltip、工具标签等）
- package.json 中 commands 和 configuration 的 title/description 使用 `vscode.l10n` 的 `%key%` 占位符语法
- 首批支持语言：中文（zh-cn/zh-tw）、英文（en，默认回退）

## Capabilities

### New Capabilities
- `extension-l10n`: Extension Host 侧本地化——使用 vscode.l10n API 替换命令标题、进度消息、QuickPick、通知消息、StatusBar 等硬编码文本
- `webview-l10n`: Webview 侧本地化——通过 postMessage 传递语言设置，使用 i18n 查找函数替换 React 组件中的硬编码字符串

### Modified Capabilities

## Impact

- `src/extension/` 下所有命令文件、StatusBar、SidebarProvider 中的字符串需替换为 `vscode.l10n.t()` 调用
- `src/webview/components/` 下所有 React 组件中的硬编码字符串需替换为 `t()` 函数调用
- `package.json` 中 commands 和 configuration 的 title/description 需改为 `%key%` 占位符
- 需新增 `package.nls.json` 和 `package.nls.zh-cn.json` 文件
- 需新增 webview 语言包文件（如 `src/webview/locales/zh-cn.json`、`src/webview/locales/en.json`）
- WebviewBridge 需在初始化时传递 `vscode.env.language` 给 webview
