# Obsidian UI 设计规范文档

## 1. 颜色系统

### 基础色板

```css
:root {
  /* 品牌色 */
  --accent-h: 254;
  --accent-s: 80%;
  --accent-l: 68%;
  --interactive-accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  --interactive-accent-hover: hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) + 5%));
  
  /* 文本色阶 */
  --text-normal: hsl(var(--base-h), var(--base-s), var(--text-normal-l));
  --text-muted: hsl(var(--base-h), var(--base-s), calc(var(--text-normal-l) - 15%));
  --text-faint: hsl(var(--base-h), var(--base-s), calc(var(--text-normal-l) - 25%));
  
  /* 背景色阶 */
  --background-primary: hsl(var(--base-h), var(--base-s), var(--bg-primary-l));
  --background-primary-alt: hsl(var(--base-h), var(--base-s), calc(var(--bg-primary-l) - 2%));
  --background-secondary: hsl(var(--base-h), var(--base-s), calc(var(--bg-primary-l) - 4%));
  --background-secondary-alt: hsl(var(--base-h), var(--base-s), calc(var(--bg-primary-l) - 6%));
  
  /* 交互状态色 */
  --background-modifier-hover: rgba(var(--mono-rgb-100), 0.075);
  --background-modifier-active-hover: rgba(var(--mono-rgb-100), 0.15);
  --background-modifier-border: rgba(var(--mono-rgb-100), 0.13);
  --background-modifier-border-hover: rgba(var(--mono-rgb-100), 0.17);
  --background-modifier-border-focus: rgba(var(--mono-rgb-100), 0.23);
}
```

### 浅色主题配置

```css
.theme-light {
  --base-h: 0;
  --base-s: 0%;
  --text-normal-l: 13%;
  --bg-primary-l: 100%;
  --mono-rgb-100: 0, 0, 0;
  
  /* 特定组件色 */
  --file-explorer-bg: #fafafa;
  --tab-bar-bg: #f3f3f3;
  --editor-bg: #ffffff;
}
```

### 深色主题配置

```css
.theme-dark {
  --base-h: 0;
  --base-s: 0%;
  --text-normal-l: 87%;
  --bg-primary-l: 13%;
  --mono-rgb-100: 255, 255, 255;
  
  /* 特定组件色 */
  --file-explorer-bg: #1e1e1e;
  --tab-bar-bg: #252525;
  --editor-bg: #202020;
}
```

## 2. 字体系统

### 字体栈定义

```css
:root {
  /* UI字体 */
  --font-interface: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  /* 编辑器字体 */
  --font-text: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  
  /* 代码字体 */
  --font-monospace: "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, "Courier New", monospace;
}
```

### 字体规格

| 用途 | 字号 | 行高 | 字重 |
|------|------|------|------|
| UI基础文本 | 13px | 1.4 | 400 |
| UI强调文本 | 13px | 1.4 | 500 |
| 编辑器正文 | 15px | 1.6 | 400 |
| 编辑器标题1 | 28px | 1.3 | 600 |
| 编辑器标题2 | 22px | 1.35 | 600 |
| 编辑器标题3 | 18px | 1.4 | 600 |
| 代码块 | 13px | 1.4 | 400 |
| 标签栏 | 13px | 1 | 400/500 |

## 3. 间距系统

### 基础间距单位

```css
:root {
  --space-unit: 4px;
  --space-xs: calc(var(--space-unit) * 1);   /* 4px */
  --space-sm: calc(var(--space-unit) * 2);   /* 8px */
  --space-md: calc(var(--space-unit) * 3);   /* 12px */
  --space-lg: calc(var(--space-unit) * 4);   /* 16px */
  --space-xl: calc(var(--space-unit) * 6);   /* 24px */
  --space-xxl: calc(var(--space-unit) * 8);  /* 32px */
}
```

### 组件间距规范

#### 文件树
- 根缩进: `var(--space-sm)`
- 层级缩进: `var(--space-lg)`
- 行高: `var(--space-xl)`
- 图标间距: `6px`

#### 标签栏
- 标签内边距: `0 30px 0 12px`
- 标签间距: `1px`
- 标签栏内边距: `4px 8px`

#### 编辑器
- 内容区内边距: `40px 60px`
- 段落间距: `var(--space-lg)`
- 列表缩进: `var(--space-xl)`

## 4. 图标系统

### 图标规格

```css
.icon {
  width: 16px;
  height: 16px;
  stroke-width: 1.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke: currentColor;
}

.icon-small {
  width: 14px;
  height: 14px;
}

.icon-large {
  width: 20px;
  height: 20px;
}
```

### 图标颜色状态

```css
.nav-file-icon {
  color: var(--text-muted);
}

.nav-file:hover .nav-file-icon {
  color: var(--text-normal);
}

.nav-file.is-active .nav-file-icon {
  color: var(--interactive-accent);
}
```

## 5. 动画系统

### 缓动函数

```css
:root {
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 动画时长

```css
:root {
  --duration-fast: 150ms;
  --duration-moderate: 200ms;
  --duration-slow: 300ms;
}
```

### 常用动画

```css
/* 悬停过渡 */
.interactive {
  transition: background-color var(--duration-fast) var(--ease-default),
              color var(--duration-fast) var(--ease-default);
}

/* 展开/收缩 */
.collapse-transition {
  transition: height var(--duration-moderate) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
}

/* 拖拽反馈 */
@keyframes drag-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

/* 链接插入高亮 */
@keyframes link-highlight {
  0% { background-color: var(--interactive-accent); opacity: 0.3; }
  100% { background-color: transparent; opacity: 0; }
}
```

## 6. 阴影系统

```css
:root {
  /* 海拔阴影 */
  --shadow-elevation-1: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-elevation-2: 0 2px 4px rgba(0, 0, 0, 0.08);
  --shadow-elevation-3: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-elevation-4: 0 8px 16px rgba(0, 0, 0, 0.12);
  
  /* 边框阴影 */
  --shadow-border: inset 0 0 0 1px var(--background-modifier-border);
  --shadow-border-focus: inset 0 0 0 2px var(--interactive-accent);
}
```

## 7. 响应式断点

```css
:root {
  --breakpoint-mobile: 480px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1440px;
}

/* 自适应侧边栏 */
@media (max-width: 768px) {
  .workspace-drawer {
    position: absolute;
    width: 280px;
    transform: translateX(-100%);
  }
  
  .workspace-drawer.is-open {
    transform: translateX(0);
  }
}
```

## 8. 无障碍设计

### 焦点指示器

```css
:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

.keyboard-focused :focus {
  box-shadow: 0 0 0 3px rgba(var(--accent-h), var(--accent-s), var(--accent-l), 0.3);
}
```

### ARIA属性

```html
<!-- 文件树 -->
<div role="tree" aria-label="File explorer">
  <div role="treeitem" 
       aria-expanded="true" 
       aria-level="1"
       aria-selected="false">
    <span role="presentation" class="tree-item-icon"></span>
    <span class="tree-item-title">Folder Name</span>
  </div>
</div>

<!-- 标签栏 -->
<div role="tablist" aria-label="Open documents">
  <button role="tab" 
          aria-selected="true" 
          aria-controls="panel-1"
          tabindex="0">
    Document 1
  </button>
</div>
```

## 9. 深色模式最佳实践

### 对比度要求

- 正文文本: 最少 7:1
- 大文本: 最少 4.5:1
- UI组件: 最少 3:1

### 颜色映射策略

```css
/* 避免纯黑/纯白 */
.theme-dark {
  --text-normal: #e3e3e3;      /* 非 #ffffff */
  --background-primary: #202020; /* 非 #000000 */
}

/* 降低饱和度 */
.theme-dark {
  --interactive-accent: hsl(254, 65%, 68%); /* 降低饱和度15% */
}
```

## 10. 性能优化指南

### CSS性能

```css
/* 使用 transform 替代 position */
.dragging {
  transform: translate(var(--drag-x), var(--drag-y));
  will-change: transform;
}

/* 避免复杂选择器 */
/* 不好 */
.workspace .workspace-leaf .view-content .markdown-preview-view p {}

/* 好 */
.markdown-preview p {}
```

### 动画性能

```css
/* GPU加速属性 */
.animated {
  transform: translateZ(0); /* 创建合成层 */
  will-change: transform, opacity; /* 仅在必要时使用 */
}

/* 动画结束后清理 */
.animation-done {
  will-change: auto;
}
```