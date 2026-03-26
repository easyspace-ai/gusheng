# ReNote 插件开发指南

## 概述

ReNote 插件系统允许开发者通过插件扩展应用功能。插件可以添加新的面板、菜单项、命令，并与工作区进行交互。

## 插件结构

每个插件都是一个包含以下文件的目录：

```
plugin-name/
├── manifest.json    # 插件描述文件
├── index.js        # 主入口文件
├── *.css           # 样式文件（可选）
└── assets/         # 其他资源文件（可选）
```

## Manifest 文件

`manifest.json` 定义了插件的基本信息和功能：

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "插件描述",
  "version": "1.0.0",
  "author": "作者名",
  "main": "index.js",
  "permissions": ["workspace:read", "ui:menu"],
  "commands": [
    {
      "id": "my-command",
      "name": "My Command",
      "callback": "myCommand",
      "hotkey": "Ctrl+Shift+M"
    }
  ],
  "menus": [
    {
      "id": "my-menu",
      "label": "My Menu",
      "action": "my-command"
    }
  ]
}
```

### 必需字段

- `id`: 插件唯一标识符
- `name`: 插件显示名称
- `version`: 版本号
- `author`: 作者
- `main`: 主入口文件

### 可选字段

- `description`: 插件描述
- `homepage`: 主页 URL
- `repository`: 代码仓库 URL
- `license`: 许可证
- `tags`: 标签数组
- `assets`: 资源文件数组
- `minAppVersion`: 最低应用版本
- `permissions`: 权限数组
- `config`: 默认配置
- `commands`: 命令定义
- `menus`: 菜单定义
- `hooks`: 钩子函数

## 插件类结构

```javascript
class MyPlugin {
  constructor(manifest) {
    this.id = manifest.id;
    this.manifest = manifest;
  }

  async onLoad(context) {
    this.context = context;
    // 插件加载时执行
  }

  async onUnload(context) {
    // 插件卸载时执行
  }

  // 命令处理函数
  myCommand() {
    this.context.ui.showNotification('Hello from plugin!', 'info');
  }
}
```

## 插件上下文 API

插件通过 `context` 对象访问应用功能：

### Logger
```javascript
context.logger.info('消息');
context.logger.error('错误');
context.logger.debug('调试信息');
```

### UI 管理
```javascript
// 显示通知
context.ui.showNotification('消息', 'success');

// 显示模态框
context.ui.showModal(MyComponent, { props });

// 添加面板
context.ui.addPanel({
  id: 'my-panel',
  title: '我的面板',
  position: 'left',
  component: MyPanelComponent
});

// 添加菜单项
context.ui.addMenuItem({
  id: 'my-menu',
  label: '我的菜单',
  action: 'my-action'
});
```

### 工作区操作
```javascript
// 获取当前文件
const file = context.workspace.getActiveFile();

// 打开文件
await context.workspace.openFile('/path/to/file.md');

// 创建文件
await context.workspace.createFile('/path/to/new.md', '内容');

// 插入文本
context.workspace.insertText('插入的文本');

// 替换选中内容
context.workspace.replaceSelection('新文本');
```

### 存储
```javascript
// 保存数据
context.storage.set('key', value);

// 读取数据
const value = context.storage.get('key');

// 删除数据
context.storage.remove('key');
```

### 事件系统
```javascript
// 监听事件
context.eventBus.on('file:opened', (file) => {
  console.log('文件已打开:', file);
});

// 发送事件
context.eventBus.emit('my-event', data);

// 取消监听
context.eventBus.off('file:opened', handler);
```

## 生命周期钩子

插件可以定义钩子函数来响应应用事件：

```javascript
class MyPlugin {
  hooks = {
    onFileOpen: (context, file) => {
      // 文件打开时执行
    },
    onFileCreate: (context, file) => {
      // 文件创建时执行
    },
    onSelectionChange: (context, selection) => {
      // 选择改变时执行
    }
  };
}
```

可用钩子：
- `onFileOpen`: 文件打开
- `onFileCreate`: 文件创建
- `onFileDelete`: 文件删除
- `onFileModify`: 文件修改
- `onSelectionChange`: 选择改变
- `onEditorChange`: 编辑器内容改变

## 权限系统

插件需要声明所需权限：

- `workspace:read`: 读取工作区文件
- `workspace:write`: 修改工作区文件
- `ui:menu`: 添加菜单项
- `ui:panel`: 添加面板
- `ui:notifications`: 显示通知
- `ui:styling`: 修改样式

## React 组件

插件可以使用 React 创建 UI 组件：

```javascript
createMyComponent() {
  return ({ context }) => {
    const [state, setState] = React.useState(initialValue);
    
    return React.createElement('div', {
      className: 'my-component'
    }, [
      React.createElement('h3', { key: 'title' }, '我的组件'),
      React.createElement('button', {
        key: 'button',
        onClick: () => setState(newValue)
      }, '点击我')
    ]);
  };
}
```

## 配置管理

```javascript
// 获取配置
const value = this.getConfig('key', 'defaultValue');

// 设置配置
this.setConfig('key', 'value');

// 加载配置
loadConfiguration() {
  const savedConfig = this.context.storage.get('config') || {};
  this.config = { ...this.manifest.config, ...savedConfig };
}
```

## 打包和分发

1. 将插件文件打包为 ZIP 文件
2. 确保包含 `manifest.json` 和主入口文件
3. 通过插件管理器安装，或放置在插件目录中

## 示例插件

查看 examples 目录中的示例插件：

- **calculator-plugin**: 计算器功能
- **todo-plugin**: 待办事项管理
- **theme-plugin**: 主题定制

## 最佳实践

1. **错误处理**: 使用 try-catch 包装可能出错的代码
2. **性能**: 避免在钩子函数中执行耗时操作
3. **清理**: 在 onUnload 中清理资源和事件监听器
4. **用户体验**: 提供清晰的反馈和错误消息
5. **配置**: 提供合理的默认配置
6. **文档**: 为用户提供使用说明

## 调试

使用浏览器开发者工具调试插件：

```javascript
// 在插件中添加调试信息
console.log('Plugin debug:', data);
this.context.logger.debug('Debug message');
```

## 社区

- 提交 Issue 报告问题
- 分享你的插件到社区
- 参与插件开发讨论

---

开始创建你的第一个插件吧！
