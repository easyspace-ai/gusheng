# Strategy Copilot 前端实现文档

## 概述

前端已实现完整的 Strategy Copilot 组件，集成在策略管理页面右侧，提供 AI 辅助修改、优化和解释策略的功能。

## 新增文件

### 组件文件
```
src/components/Strategy/Copilot/
├── index.ts              # 组件导出
├── types.ts              # TypeScript 类型定义
├── templates.ts          # 内置模板配置
├── StrategyCopilot.tsx   # 主组件 (350+ 行)
└── README.md             # 组件文档
```

### 更新文件
```
src/components/Strategy/StrategyRouteLayout.tsx  # 集成 Copilot 组件
src/lib/strategyApi.ts                            # 新增 AI API 客户端
```

## 功能特性

### 1. 三种 AI 模式

| 模式 | 功能 | 适用场景 |
|------|------|----------|
| **修改策略** | 基于内置模板修改策略代码 | 从模板创建新策略、添加过滤条件 |
| **优化策略** | 优化现有策略的性能 | 降低回撤、提高夏普比率 |
| **解释策略** | 生成策略的中文解释 | 理解策略逻辑、文档生成 |

### 2. 用户界面

- **Tab 切换**: 三种模式通过 Tabs 组件切换
- **模板选择器**: 修改模式下可选择 4 个内置模板
- **智能输入**: 支持 Cmd/Ctrl + Enter 快速发送
- **结果展示**: 
  - 代码验证状态（通过/错误）
  - 修改内容列表
  - 参数配置预览
  - 一键应用到编辑器

### 3. 交互流程

```
用户输入需求 → 调用后端 API → AI 生成代码 → 后端验证 → 
前端展示结果 → 用户一键应用 → 代码同步到编辑器
```

## API 接口

### 前端 API 客户端 (src/lib/strategyApi.ts)

```typescript
// 基于模板修改策略
export async function modifyStrategy(
  payload: StrategyModifyRequest
): Promise<StrategyModifyResponse>

// 优化现有策略
export async function optimizeStrategy(
  strategyId: number,
  payload: StrategyOptimizeRequest
): Promise<StrategyOptimizeResponse>

// 解释策略
export async function explainStrategy(
  strategyId: number
): Promise<StrategyExplainResponse>
```

### 请求/响应类型

```typescript
interface StrategyModifyRequest {
  template_name: string      // 模板名称
  requirements: string       // 修改需求描述
  temperature?: number       // LLM 温度参数
}

interface StrategyModifyResponse {
  code: string               // 生成的代码
  changes: string[]          // 修改内容列表
  parameters_schema: object  // 参数配置
  is_valid: boolean          // 验证状态
  errors: string[]           // 验证错误
  base_template: string      // 基础模板
}
```

## 使用示例

### 修改策略示例

1. 选择 **"修改策略"** 标签
2. 在模板下拉框选择 **"双均线策略"**
3. 输入需求：
   ```
   增加RSI过滤，RSI大于70时不买入，RSI小于30时不卖出
   ```
4. 点击发送
5. 查看生成的代码和修改内容
6. 点击 **"应用代码"** 同步到编辑器

### 优化策略示例

1. 选择 **"优化策略"** 标签
2. 输入优化目标：
   ```
   降低最大回撤，加强风险控制
   ```
3. 点击发送
4. 查看 AI 的分析报告和优化建议
5. 应用优化后的代码

### 解释策略示例

1. 选择 **"解释策略"** 标签
2. 点击 **"获取解释"**
3. 查看策略的详细中文解释：
   - 策略概述
   - 入场/出场条件
   - 风险管理
   - 关键参数
   - 适用场景

## 组件集成

### 在 StrategyRouteLayout 中使用

```tsx
// 替换原有的 rightPanel 定义
const rightPanel = (
  <StrategyCopilot
    currentStrategy={selectedStrategy}
    currentCode={editorState.code}
    onCodeChange={(code) => {
      setEditorState(prev => ({ ...prev, code }))
      setDirty(true)
    }}
    onSchemaChange={(schema) => {
      setEditorState(prev => ({ 
        ...prev, 
        parametersSchemaText: JSON.stringify(schema, null, 2) 
      }))
      setDirty(true)
    }}
  />
)
```

## 样式设计

- **整体风格**: 与现有策略页面保持一致
- **配色方案**: Slate 色系，支持暗黑模式
- **布局结构**: 
  - Header: 标题和状态指示器
  - Tabs: 三种模式切换
  - Content: 消息历史和结果展示
  - Footer: 输入框和操作按钮

## 技术栈

- **React 18** + TypeScript
- **Tailwind CSS** 样式
- **Radix UI** 组件库
  - Tabs
  - Select
  - ScrollArea
  - Badge
  - Button
- **Lucide React** 图标
- **Sonner** Toast 通知

## 注意事项

1. **环境变量**: 确保后端配置了 LLM API 密钥
2. **网络请求**: 所有请求都有错误处理和 loading 状态
3. **代码验证**: 生成的代码会自动验证，验证失败会显示错误信息
4. **用户体验**: 支持快捷键、Toast 提示、加载状态

## 后续优化方向

1. **历史记录**: 保存用户的修改历史
2. **对比视图**: 代码对比功能（前后对比）
3. **预设提示**: 常用修改需求的快捷按钮
4. **批量操作**: 支持批量优化多个策略
5. **版本管理**: 集成策略版本控制
