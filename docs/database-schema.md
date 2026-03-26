# 数据库设计方案

基于 SiYuan 的数据模型设计，结合我们项目的需求。

## 核心表结构

### 1. notebooks (笔记本表)
```sql
CREATE TABLE notebooks (
    id TEXT PRIMARY KEY,           -- 笔记本ID
    name TEXT NOT NULL,            -- 笔记本名称
    icon TEXT DEFAULT '',          -- 笔记本图标
    sort INTEGER DEFAULT 0,        -- 排序权重
    closed INTEGER DEFAULT 0,      -- 是否关闭 (0=打开, 1=关闭)
    created TEXT NOT NULL,         -- 创建时间 (ISO 8601)
    updated TEXT NOT NULL          -- 更新时间 (ISO 8601)
);
```

### 2. blocks (块表 - 核心数据结构)
```sql
CREATE TABLE blocks (
    id TEXT PRIMARY KEY,           -- 块ID (20位随机字符串)
    parent_id TEXT,                -- 父块ID
    root_id TEXT NOT NULL,         -- 根块ID (文档ID)
    type TEXT NOT NULL,            -- 块类型 (NodeDocument, NodeParagraph, NodeHeading, etc.)
    subtype TEXT DEFAULT '',       -- 块子类型
    content TEXT NOT NULL,         -- 块内容 (HTML格式)
    markdown TEXT NOT NULL,        -- Markdown 原文
    path TEXT NOT NULL,            -- 文件路径
    hpath TEXT DEFAULT '',         -- 人类可读路径
    name TEXT DEFAULT '',          -- 块名称 (标题)
    alias TEXT DEFAULT '',         -- 别名
    memo TEXT DEFAULT '',          -- 备注
    tag TEXT DEFAULT '',           -- 标签
    ial TEXT DEFAULT '{}',         -- 内联属性列表 (JSON)
    sort INTEGER DEFAULT 0,        -- 排序
    created TEXT NOT NULL,         -- 创建时间
    updated TEXT NOT NULL,         -- 更新时间
    
    FOREIGN KEY (root_id) REFERENCES blocks(id) ON DELETE CASCADE
);
```

### 3. attributes (属性表)
```sql
CREATE TABLE attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id TEXT NOT NULL,        -- 块ID
    name TEXT NOT NULL,            -- 属性名
    value TEXT NOT NULL,           -- 属性值
    type TEXT DEFAULT 'text',      -- 属性类型 (text, number, date, etc.)
    created TEXT NOT NULL,
    updated TEXT NOT NULL,
    
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    UNIQUE(block_id, name)
);
```

### 4. refs (引用关系表)
```sql
CREATE TABLE refs (
    id TEXT PRIMARY KEY,
    def_block_id TEXT NOT NULL,    -- 定义块ID (被引用的块)
    def_block_path TEXT NOT NULL,  -- 定义块路径
    def_block_content TEXT,        -- 定义块内容
    def_block_subtype TEXT,        -- 定义块子类型
    block_id TEXT NOT NULL,        -- 引用块ID (包含引用的块)
    root_id TEXT NOT NULL,         -- 引用块所在文档ID
    box TEXT NOT NULL,             -- 笔记本ID
    path TEXT NOT NULL,            -- 引用块路径
    content TEXT NOT NULL,         -- 引用上下文内容
    markdown TEXT NOT NULL,        -- 引用上下文 Markdown
    type TEXT NOT NULL,            -- 引用类型 (ref, embed, etc.)
    created TEXT NOT NULL,
    updated TEXT NOT NULL,
    
    FOREIGN KEY (def_block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
);
```

### 5. spans (全文搜索索引表)
```sql
CREATE TABLE spans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id TEXT NOT NULL,        -- 块ID
    root_id TEXT NOT NULL,         -- 根块ID
    box TEXT NOT NULL,             -- 笔记本ID
    path TEXT NOT NULL,            -- 文件路径
    content TEXT NOT NULL,         -- 索引内容
    markdown TEXT NOT NULL,        -- Markdown 内容
    type TEXT NOT NULL,            -- 内容类型
    ial TEXT DEFAULT '{}',         -- 内联属性
    created TEXT NOT NULL,
    updated TEXT NOT NULL,
    
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
);
```

### 6. file_annotation_refs (文件注解引用表)
```sql
CREATE TABLE file_annotation_refs (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,       -- 文件路径
    annotation_id TEXT NOT NULL,   -- 注解ID
    block_id TEXT NOT NULL,        -- 引用块ID
    root_id TEXT NOT NULL,         -- 根块ID
    box TEXT NOT NULL,             -- 笔记本ID
    path TEXT NOT NULL,            -- 块路径
    content TEXT NOT NULL,         -- 引用内容
    type TEXT NOT NULL,            -- 引用类型
    created TEXT NOT NULL,
    updated TEXT NOT NULL,
    
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
);
```

## 索引设计

```sql
-- blocks 表索引
CREATE INDEX idx_blocks_parent_id ON blocks(parent_id);
CREATE INDEX idx_blocks_root_id ON blocks(root_id);
CREATE INDEX idx_blocks_type ON blocks(type);
CREATE INDEX idx_blocks_path ON blocks(path);
CREATE INDEX idx_blocks_updated ON blocks(updated);
CREATE INDEX idx_blocks_created ON blocks(created);

-- refs 表索引
CREATE INDEX idx_refs_def_block_id ON refs(def_block_id);
CREATE INDEX idx_refs_block_id ON refs(block_id);
CREATE INDEX idx_refs_root_id ON refs(root_id);
CREATE INDEX idx_refs_box ON refs(box);

-- spans 表索引 (全文搜索)
CREATE INDEX idx_spans_block_id ON spans(block_id);
CREATE INDEX idx_spans_root_id ON spans(root_id);
CREATE INDEX idx_spans_box ON spans(box);
CREATE INDEX idx_spans_content ON spans(content);

-- attributes 表索引
CREATE INDEX idx_attributes_block_id ON attributes(block_id);
CREATE INDEX idx_attributes_name ON attributes(name);
```

## 数据迁移策略

### 阶段1：基础数据导入
1. 扫描现有的文件系统结构
2. 为每个 Markdown 文件创建对应的 notebook 和 root block
3. 解析 Markdown 内容，创建子块结构

### 阶段2：内容解析和索引
1. 使用 Markdown 解析器分析文档结构
2. 创建 blocks 表记录
3. 建立 spans 索引用于全文搜索

### 阶段3：关系建立
1. 解析双向链接语法 `[[文档名]]`
2. 建立 refs 表记录
3. 处理标签和属性

## 兼容性考虑

1. **文件系统备份**：保持原有文件系统结构作为备份
2. **双向同步**：数据库更新时同步更新文件系统
3. **导出功能**：支持将数据库内容导出为 Markdown 文件
4. **版本控制**：支持 Git 版本控制集成

## 性能优化

1. **批量操作**：使用事务批量插入和更新
2. **懒加载**：按需加载文档内容
3. **缓存策略**：热点数据内存缓存
4. **分页查询**：大量数据分页处理
