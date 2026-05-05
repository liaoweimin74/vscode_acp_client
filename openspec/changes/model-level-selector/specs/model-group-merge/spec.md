## ADDED Requirements

### Requirement: 模型选项按分组合并显示
当模型配置选项的 options 为 `Array<SessionConfigSelectGroup>` 时，ConfigBar 的模型下拉菜单 SHALL 仅显示组名（如 "deepseek"），而非展开所有组内选项。

#### Scenario: 分组模型列表显示
- **WHEN** 模型配置选项的 options 为分组结构（包含 group 和 name 字段）
- **THEN** 模型下拉菜单仅显示每个组的 name 作为可选项

#### Scenario: 无分组模型列表显示
- **WHEN** 模型配置选项的 options 为平铺结构（`Array<SessionConfigSelectOption>`）
- **THEN** 模型下拉菜单显示所有选项的 name，行为与当前一致

### Requirement: 级别选择器
当当前选中的模型属于某个分组时，ConfigBar SHALL 在模型按钮右侧显示一个级别选择下拉框，展示该组内的所有级别选项。

#### Scenario: 选中分组模型时显示级别选择器
- **WHEN** 当前模型的 currentValue 属于某个分组
- **THEN** 模型按钮右侧显示级别选择器，列出该组所有选项

#### Scenario: 选中无分组模型时不显示级别选择器
- **WHEN** 当前模型的 currentValue 属于无分组的平铺选项
- **THEN** 不显示级别选择器

#### Scenario: 切换级别
- **WHEN** 用户在级别选择器中选择一个级别
- **THEN** 系统调用 setConfig 将模型设置为该级别对应的 value

### Requirement: 默认级别选择
切换模型组时，系统 SHALL 按以下优先级自动选择默认级别：名称包含 "high" 的选项 > 名称包含 "medium" 的选项 > 组内首个选项。

#### Scenario: 切换到含 high 级别的模型组
- **WHEN** 用户选择一个模型组，且该组包含名称含 "high" 的选项
- **THEN** 系统自动选中该 high 级别选项

#### Scenario: 切换到无 high 但有 medium 级别的模型组
- **WHEN** 用户选择一个模型组，该组不含 high 但含名称含 "medium" 的选项
- **THEN** 系统自动选中该 medium 级别选项

#### Scenario: 切换到无 high/medium 的模型组
- **WHEN** 用户选择一个模型组，该组不含 high 也不含 medium
- **THEN** 系统自动选中组内首个选项

### Requirement: 模型按钮显示当前模型组名
当当前模型属于某个分组时，模型按钮 SHALL 显示该组的 name，而非完整的选项名。

#### Scenario: 分组模型的按钮文本
- **WHEN** 当前模型的 currentValue 属于 "deepseek" 组
- **THEN** 模型按钮显示 "deepseek"

#### Scenario: 无分组模型的按钮文本
- **WHEN** 当前模型的 currentValue 属于无分组的平铺选项
- **THEN** 模型按钮显示该选项的 name

### Requirement: VSCode 命令面板适配分组选择
`vscodeAcp.selectModel` 命令 SHALL 适配分组逻辑：先选择模型组，再选择级别。

#### Scenario: 命令面板选择分组模型
- **WHEN** 用户通过命令面板选择模型，且模型选项为分组结构
- **THEN** 先显示组名列表，选择组后再显示该组级别列表

#### Scenario: 命令面板选择无分组模型
- **WHEN** 用户通过命令面板选择模型，且模型选项为平铺结构
- **THEN** 直接显示所有选项，行为与当前一致

### Requirement: 级别选择器显示当前级别
级别选择器 SHALL 显示当前选中的级别名称。

#### Scenario: 当前级别显示
- **WHEN** 当前模型为 deepseek 组的 high 级别
- **THEN** 级别选择器按钮显示 "high"
