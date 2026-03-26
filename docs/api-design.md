# API 设计方案

基于 SiYuan 的 API 架构，设计符合 RESTful 规范的 API 接口。

## API 架构原则

1. **模块化设计**：按功能模块划分 API 端点
2. **统一响应格式**：所有 API 返回统一的 JSON 格式
3. **权限控制**：实现完整的认证和授权机制
4. **版本管理**：支持 API 版本控制
5. **错误处理**：标准化的错误码和错误信息

## 统一响应格式

```json
{
  "code": 0,           // 状态码 (0=成功, 非0=错误)
  "msg": "success",    // 消息
  "data": {...}        // 响应数据
}
```

## 核心 API 端点

### 1. 系统管理 API

#### GET /api/system/version
获取系统版本信息
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "version": "1.0.0",
    "build": "20241222"
  }
}
```

#### POST /api/system/bootProgress
获取启动进度
```json
{
  "code": 0,
  "msg": "success", 
  "data": {
    "progress": 100,
    "details": "System ready"
  }
}
```

### 2. 笔记本管理 API

#### POST /api/notebook/lsNotebooks
列出所有笔记本
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "notebooks": [
      {
        "id": "20241222120000-abcdefg",
        "name": "我的笔记本",
        "icon": "📔",
        "sort": 0,
        "closed": false,
        "created": "2024-12-22T12:00:00Z",
        "updated": "2024-12-22T12:00:00Z"
      }
    ]
  }
}
```

#### POST /api/notebook/createNotebook
创建笔记本
```json
// Request
{
  "name": "新笔记本",
  "icon": "📕"
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": {
    "notebook": {
      "id": "20241222120100-hijklmn",
      "name": "新笔记本",
      "icon": "📕",
      "sort": 1,
      "closed": false,
      "created": "2024-12-22T12:01:00Z",
      "updated": "2024-12-22T12:01:00Z"
    }
  }
}
```

#### POST /api/notebook/removeNotebook
删除笔记本
```json
// Request
{
  "notebook": "20241222120100-hijklmn"
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": null
}
```

### 3. 文件树 API

#### POST /api/filetree/listDocTree
获取文档树
```json
// Request
{
  "notebook": "20241222120000-abcdefg",
  "path": "/",
  "maxListCount": 1000
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": {
    "files": [
      {
        "id": "20241222120200-opqrstu",
        "name": "文档1.md",
        "type": "NodeDocument",
        "path": "/文档1.md",
        "icon": "📄",
        "count": 0,
        "created": "2024-12-22T12:02:00Z",
        "updated": "2024-12-22T12:02:00Z",
        "children": []
      }
    ],
    "box": "20241222120000-abcdefg",
    "path": "/"
  }
}
```

#### POST /api/filetree/createDocWithMd
创建文档
```json
// Request
{
  "notebook": "20241222120000-abcdefg",
  "path": "/新文档.md",
  "markdown": "# 新文档\n\n这是一个新文档。"
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "20241222120300-vwxyz12"
  }
}
```

#### POST /api/filetree/removeDoc
删除文档
```json
// Request
{
  "notebook": "20241222120000-abcdefg",
  "path": "/文档1.md"
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": null
}
```

### 4. 文档内容 API

#### POST /api/filetree/getDoc
获取文档内容
```json
// Request
{
  "id": "20241222120200-opqrstu",
  "mode": 0,
  "size": 1024
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "20241222120200-opqrstu",
    "rootID": "20241222120200-opqrstu",
    "title": "文档1",
    "content": "<div data-node-id=\"...\">...</div>",
    "path": "/文档1.md",
    "parent2ID": "",
    "parentID": "",
    "type": "NodeDocument",
    "updated": "2024-12-22T12:02:00Z"
  }
}
```

#### POST /api/block/updateBlock
更新块内容
```json
// Request
{
  "dataType": "markdown",
  "data": "# 更新后的标题\n\n更新后的内容",
  "id": "20241222120200-opqrstu"
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "doOperations": [
        {
          "action": "update",
          "id": "20241222120200-opqrstu",
          "data": "...",
          "retData": null
        }
      ],
      "undoOperations": null
    }
  ]
}
```

### 5. 搜索 API

#### POST /api/search/searchBlock
搜索块
```json
// Request
{
  "query": "搜索关键词",
  "types": {
    "document": true,
    "heading": true,
    "paragraph": true
  },
  "paths": [],
  "boxes": [],
  "method": 0,
  "orderBy": 0,
  "groupBy": 0,
  "page": 1,
  "pageSize": 32
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": {
    "blocks": [
      {
        "id": "20241222120200-opqrstu",
        "rootID": "20241222120200-opqrstu",
        "parentID": "",
        "type": "NodeDocument",
        "content": "文档1",
        "path": "/文档1.md",
        "hPath": "文档1",
        "box": "20241222120000-abcdefg"
      }
    ],
    "matchedBlockCount": 1,
    "matchedRootCount": 1,
    "pageCount": 1
  }
}
```

### 6. 标签 API

#### POST /api/tag/getTag
获取所有标签
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "tags": [
      {
        "name": "重要",
        "count": 5
      },
      {
        "name": "工作",
        "count": 10
      }
    ]
  }
}
```

### 7. WebSocket API

WebSocket 连接端点：`/ws`

#### 消息格式
```json
{
  "cmd": "transactions",
  "data": {
    "doOperations": [...],
    "undoOperations": [...]
  },
  "callback": "callback-id"
}
```

#### 支持的命令类型
- `transactions` - 编辑操作同步
- `reload` - 重新加载文档
- `create` - 文档创建通知
- `rename` - 文档重命名通知
- `remove` - 文档删除通知
- `mount` - 笔记本挂载通知
- `unmount` - 笔记本卸载通知

## 认证和授权

### 1. API Token 认证
```http
Authorization: Token your-api-token
```

### 2. 访问权限控制
- `CheckAuth` - 基础认证检查
- `CheckAdminRole` - 管理员权限检查  
- `CheckReadonly` - 只读模式检查

### 3. 跨域处理
```go
// CORS 配置
config := cors.DefaultConfig()
config.AllowOrigins = []string{"http://localhost:3000"}
config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
config.AllowHeaders = []string{"Authorization", "Content-Type"}
```

## 错误码定义

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -1 | 一般错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 实现优先级

### 第一阶段（核心功能）
1. ✅ 系统管理 API
2. ✅ 笔记本管理 API
3. ✅ 文件树 API
4. ✅ 文档内容 API

### 第二阶段（增强功能）
1. 🔄 搜索 API
2. 🔄 标签 API
3. 🔄 WebSocket 实时同步

### 第三阶段（高级功能）
1. ⏳ 双向链接 API
2. ⏳ 插件 API
3. ⏳ 导入导出 API
