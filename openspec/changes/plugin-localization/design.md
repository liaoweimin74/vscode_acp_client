## Context

当前插件所有用户可见文本硬编码为英文，分布在三个层面：
1. **package.json** — commands.title、configuration properties 的 title/description
2. **Extension Host** — 命令文件中的 QuickPick title/placeholder、withProgress title、showXxxMessage 文本、StatusBar tooltip
3. **Webview (React)** — 组件中的 placeholder、button text、aria-label、tooltip、工具标签（KIND_LABELS）等

VSCode 1.85+ 内置 `vscode.l10n` API，Extension Host 侧可直接使用。Webview 侧无法直接访问 `vscode.l10n`，需通过 postMessage 传递语言信息并自建查找机制。

## Goals / Non-Goals

**Goals:**
- Extension Host 侧使用 `vscode.l10n.t()` 替换所有硬编码字符串
- package.json 使用 `%key%` 占位符 + `package.nls.json` / `package.nls.zh-cn.json`
- Webview 侧通过 `vscode.env.language` 获取语言，使用 i18n 查找函数替换硬编码字符串
- 首批支持中文简体（zh-cn）、中文繁体（zh-tw）、英文（en）
- 语言切换实时生效，无需重启插件

**Non-Goals:**
- 不支持用户自定义翻译
- 不支持运行时动态加载语言包（所有语言包随扩展打包）
- 不做日期/数字格式化（使用浏览器/VSCode 默认行为）

## Decisions

### D1: Extension Host 侧使用 `vscode.l10n` API

**选择**: `vscode.l10n.t("key", "default message")` + `package.nls.*.json`

**理由**: VSCode 1.85+ 内置，无需额外依赖，与 VSCode 生态一致。`package.json` 中的 `%key%` 语法自动关联 `package.nls.json`。

**替代方案**:
- `vscode-nls` 第三方库：旧方案，`vscode.l10n` 是官方替代，更轻量
- 自建 i18n 系统：重复造轮子，无必要

### D2: Webview 侧使用静态 JSON 语言包 + `t()` 查找函数

**选择**: 在 `src/webview/locales/` 下放置 `en.json`、`zh-cn.json`、`zh-tw.json`，通过 `t("key")` 函数查找

**理由**: Webview 无法访问 `vscode.l10n`，需自建轻量方案。静态 JSON 打包进 webview bundle，无额外网络请求。

**替代方案**:
- i18next 等第三方库：过重，本插件字符串量少（约 80 条），不值得引入
- 从 Extension Host 逐条传递：通信开销大，响应慢

### D3: 语言传递方式——初始化时通过 `acquireVsCodeApi` 上下文 + state_update

**选择**: SidebarProvider 在 webview 初始化时通过 `initialState` 传递 `vscode.env.language`，后续语言变更通过 `state_update` 同步

**理由**: 复用现有 state 传递机制，无需新增消息类型。`vscode.env.language` 在 VSCode 语言变更时自动更新。

### D4: 语言包 key 命名规范

**选择**: 使用点分层级命名，如 `prompt.placeholder.connected`、`command.selectAgent`、`toolKind.read`

**理由**: 层级结构清晰，便于维护和查找，与组件结构对应。

## Risks / Trade-offs

- **[遗漏字符串]** → 实施时逐文件 grep 所有硬编码字符串，建立清单后逐一替换
- **[语言包不完整]** → `t()` 函数 fallback 到英文 key 对应的值，确保不会显示空白
- **[package.json %key% 语法兼容性]** → VSCode 1.85+ 完全支持，与 engines 要求一致
- **[Webview 语言包体积]** → 约 80 条字符串，JSON 约 2-3KB，可忽略
