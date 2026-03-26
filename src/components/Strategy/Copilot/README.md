# Strategy Copilot Component

AI 策略助手组件，集成在后端 API 基础上，提供基于模板修改、优化和解释策略的功能。

## 使用方式

```tsx
import { StrategyCopilot } from './Copilot'

// 在策略页面中使用
<StrategyCopilot
  currentStrategy={selectedStrategy}
  currentCode={editorState.code}
  onCodeChange={(code) => setEditorState(prev => ({ ...prev, code }))}
  onSchemaChange={(schema) => setEditorState(prev => ({ 
    ...prev, 
    parametersSchemaText: JSON.stringify(schema, null, 2) 
  }))}
/>
```

## 功能

### 1. 基于模板修改 (Modify)
- 选择内置模板（双均线、市场情绪、ETF轮动、对冲）
- 输入自然语言修改需求
- AI 生成修改后的代码
- 显示修改内容和参数变化

### 2. 优化策略 (Optimize)
- 针对当前策略进行优化
- 支持优化目标：降低回撤、提高夏普比率、提高胜率等
- AI 提供分析和建议
- 生成优化后的代码

### 3. 解释策略 (Explain)
- 解析策略逻辑
- 生成中文解释报告
- 包括入场/出场条件、风险管理、参数说明

## 文件结构

```
Copilot/
├── index.ts              # 导出
├── types.ts              # 类型定义
├── templates.ts          # 模板配置
├── StrategyCopilot.tsx   # 主组件
└── README.md             # 本文档
```

## API 依赖

需要后端提供以下 API：

- `POST /strategies/modify` - 基于模板修改
- `POST /strategies/{id}/optimize` - 优化策略
- `POST /strategies/{id}/explain` - 解释策略

## 环境变量

后端需要配置：

```bash
LLM_API_URL=https://api.moonshot.cn/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=kimi-k2.5
```
