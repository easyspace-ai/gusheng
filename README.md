# ReNote - Obsidian 风格笔记应用

一个高保真复刻 Obsidian 笔记软件的 React 应用，支持 Markdown 编辑、双向链接、图谱视图等核心功能。

## 功能特性

✅ **完整的 UI 布局**
- 四栏布局：活动栏、左侧边栏、主编辑区、右侧边栏
- 顶部工具栏：侧边栏切换、主题切换、新建笔记等
- 暗色/浅色主题切换
- 响应式设计，支持拖拽调整侧边栏宽度

✅ **文件管理**
- 左侧文件树，显示所有笔记
- 支持新建、重命名、删除笔记
- 文件搜索功能
- 标签系统（自动识别 #标签）

✅ **Markdown 编辑**
- 实时预览 + 源码编辑 + 分屏模式
- 语法高亮和自动缩进
- 支持代码块、表格、引用等
- 内部链接 [[笔记名]] 语法支持

✅ **双向链接系统**
- 支持 [[笔记名]] 语法创建链接
- 自动识别和解析链接关系
- 反向链接面板显示引用关系
- 点击链接快速跳转

✅ **图谱视图**
- D3.js 驱动的可视化关系图
- 节点表示笔记，边表示链接关系
- 支持缩放、拖拽、点击导航
- 节点大小反映连接数量

✅ **高级功能**
- 命令面板 (Ctrl+P / Cmd+P)
- 多标签页编辑
- 大纲视图（自动提取标题）
- 右键菜单系统
- 搜索功能（全文搜索）

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 使用说明

### 基础操作
- **新建笔记**: 点击顶部工具栏的 `+` 按钮或使用命令面板
- **切换主题**: 点击顶部工具栏的主题按钮
- **切换面板**: 使用活动栏或顶部工具栏按钮
- **编辑模式**: 使用编辑器工具栏切换编辑/预览/分屏模式

### 快捷键
- `Ctrl/Cmd + P`: 打开命令面板
- `Ctrl/Cmd + N`: 新建笔记
- `ESC`: 关闭命令面板或对话框

### 双向链接
在笔记中使用 `[[笔记名]]` 语法创建链接：
```markdown
这是一个指向 [[其他笔记]] 的链接。
```

### 标签系统
在笔记中使用 `#标签名` 创建标签：
```markdown
这是一个关于 #编程 和 #学习 的笔记。
```

## 技术栈

- **前端框架**: React 18 + TypeScript
- **样式系统**: TailwindCSS
- **构建工具**: Vite
- **状态管理**: React Context + useReducer
- **Markdown**: react-markdown
- **图谱可视化**: D3.js
- **图标**: Lucide React

## 项目结构

```
src/
├── components/           # 组件目录
│   ├── Layout/          # 布局组件
│   ├── Editor/          # 编辑器组件
│   ├── FileExplorer/    # 文件浏览器
│   ├── Tabs/            # 标签页系统
│   ├── Search/          # 搜索功能
│   ├── Tags/            # 标签管理
│   ├── Backlinks/       # 反向链接
│   ├── Outline/         # 大纲视图
│   ├── Graph/           # 图谱视图
│   ├── CommandPalette/  # 命令面板
│   └── ContextMenu/     # 右键菜单
├── contexts/            # React Context
└── App.tsx             # 主应用组件
```

## 开发说明

这个项目是对 Obsidian 笔记软件的高保真复刻，重点实现了以下核心特性：

1. **视觉还原**: 尽可能接近 Obsidian 的界面设计和交互体验
2. **功能完整**: 实现了 Obsidian 的主要功能模块
3. **代码质量**: 使用 TypeScript 确保类型安全，模块化设计便于维护
4. **可扩展性**: 预留了插件系统和主题系统的扩展接口

## 未来规划

- [ ] 拖拽标签实现分屏
- [ ] 插件系统开发
- [ ] 更多主题支持
- [ ] 文件夹组织功能
- [ ] 导入/导出功能
- [ ] 协作编辑支持

## License

MIT License

## 主题与外观

我们提供统一的、Obsidian 风格的设计令牌（Design Tokens），并内置多主题：`obsidian`、`nord`、`solarized`，支持暗/浅两种模式。

- Token 类名示例：`bg-background`、`text-foreground`、`border-border`、`bg-panel`、`bg-card`、`hover:bg-nav-hover`、`bg-tab-active`。
- 变量定义位置：`src/index.css`（`:root`、`.dark` 和 `html[data-theme]`）。
- Tailwind 映射：`tailwind.config.js` 中的 `theme.extend.colors` 将 Token 映射到 CSS 变量。
- 启动时防闪烁：`src/main.tsx` 会读取 LocalStorage，优先应用主题与暗色模式。

在代码中使用 Token：
```tsx
<div className="bg-background text-foreground border border-border" />
<button className="hover:bg-nav-hover" />
```

在运行时切换主题/模式：
```ts
import { useAppStore } from './src/stores'

const { setTheme, toggleTheme } = useAppStore.getState()
setTheme('nord') // obsidian | nord | solarized
toggleTheme()    // 在暗/浅之间切换
```
