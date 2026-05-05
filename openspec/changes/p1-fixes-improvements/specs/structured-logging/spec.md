## ADDED Requirements

### Requirement: Logger class with OutputChannel
Extension Host SHALL 使用 `Logger` 类替代所有 `console.log` / `console.error` 调用，底层使用 VSCode `OutputChannel`。

#### Scenario: Logger initialization
- **WHEN** 扩展激活时
- **THEN** 创建名为 "ACP Agent" 的 OutputChannel 并初始化 Logger 单例

#### Scenario: Log level support
- **WHEN** 调用 `Logger.debug()`, `Logger.info()`, `Logger.warn()`, `Logger.error()`
- **THEN** 按级别格式化输出 `[ACP][DEBUG] message` 或 `[ACP][INFO] message` 等到 OutputChannel

#### Scenario: Default log level
- **WHEN** 未配置日志级别
- **THEN** 默认级别为 `info`，`debug` 级别的日志不输出

#### Scenario: Configurable log level
- **WHEN** 用户在设置中配置 `vscodeAcp.logLevel` 为 `debug`
- **THEN** Logger 输出所有级别包括 debug

### Requirement: Replace console.log in production code
所有 Extension Host 生产代码中的 `console.log` 和 `console.error` SHALL 被替换为 Logger 调用。

#### Scenario: AgentConnection logging
- **WHEN** `AgentConnection.ts` 中的 `console.log` 被调用
- **THEN** 替换为 `Logger.info()` 或 `Logger.debug()`

#### Scenario: Error logging
- **WHEN** `AgentConnection.ts` 中的 `console.error` 被调用
- **THEN** 替换为 `Logger.error()`

### Requirement: Logger disposal
Logger SHALL 在扩展停用时正确释放 OutputChannel 资源。

#### Scenario: Extension deactivation
- **WHEN** 扩展停用
- **THEN** 调用 `Logger.dispose()` 释放 OutputChannel
