## ADDED Requirements

### Requirement: flattenSelectOptions shared utility
系统 SHALL 提供 `flattenSelectOptions` 函数在 `src/shared/utils.ts` 中，将分组或非分组的 select options 统一展平为一维数组。

#### Scenario: Flatten grouped options
- **WHEN** 传入 `Array<{ group: string; name: string; options: SessionConfigSelectOption[] }>` 格式的分组选项
- **THEN** 返回所有子选项的平铺数组 `SessionConfigSelectOption[]`

#### Scenario: Flatten ungrouped options
- **WHEN** 传入 `SessionConfigSelectOption[]` 格式的非分组选项
- **THEN** 原样返回该数组

#### Scenario: Empty options
- **WHEN** 传入空数组
- **THEN** 返回空数组

### Requirement: Eliminate duplicate flattenSelectOptions definitions
`src/extension/commands/selectModel.ts`、`src/extension/commands/setThoughtLevel.ts`、`src/webview/components/ConfigBar.tsx` 中的 `flattenSelectOptions` / `flattenOptions` 函数 SHALL 被移除，改为从 `src/shared/utils.ts` 导入。

#### Scenario: selectModel uses shared utility
- **WHEN** `selectModel.ts` 需要展平选项
- **THEN** 从 `@shared/utils` 导入 `flattenSelectOptions`

#### Scenario: ConfigBar uses shared utility
- **WHEN** `ConfigBar.tsx` 需要展平选项
- **THEN** 从 `@shared/utils` 导入 `flattenSelectOptions`
