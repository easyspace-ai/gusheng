# Obsidian 交互流程与状态转换图

## 1. 拖拽生成链接 - 详细交互流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant FT as 文件树
    participant DragAPI as 拖拽API
    participant Editor as 编辑器
    participant Preview as 预览反馈
    
    User->>FT: 鼠标按下文件
    FT->>FT: 检测移动距离
    
    alt 移动 > 5px
        FT->>DragAPI: 初始化拖拽
        DragAPI->>Preview: 创建拖拽副本
        Preview-->>User: 显示半透明文件标签
        
        User->>Editor: 拖拽到编辑器
        Editor->>Editor: 检测拖拽悬停
        Editor->>Preview: 显示插入指示器
        Preview-->>User: 蓝色竖线 + copy光标
        
        User->>Editor: 释放鼠标
        Editor->>Editor: 获取光标位置
        Editor->>Editor: 插入 [[filename]]
        Editor->>Preview: 触发高亮动画
        Preview-->>User: 400ms 渐隐效果
    else 移动 < 5px
        FT->>FT: 执行点击选中
    end
```

## 2. 多标签页导航 - 状态机

```mermaid
stateDiagram-v2
    [*] --> 空标签栏
    
    空标签栏 --> 单标签页: 打开文件
    单标签页 --> 多标签页: 打开新文件
    
    多标签页 --> 多标签页: 切换标签
    多标签页 --> 多标签页: 重排标签
    多标签页 --> 单标签页: 关闭标签
    
    单标签页 --> 空标签栏: 关闭最后标签
    
    state 多标签页 {
        [*] --> 标签激活
        标签激活 --> 标签悬停: 鼠标移入
        标签悬停 --> 标签激活: 鼠标移出
        标签悬停 --> 拖拽中: 开始拖拽
        拖拽中 --> 标签激活: 释放(原位)
        拖拽中 --> 重新排序: 释放(新位)
        拖拽中 --> 创建新窗口: 释放(外部)
    }
```

## 3. 文件树选中状态 - 状态转换

```mermaid
graph TB
    subgraph 触发源
        T1[用户点击文件]
        T2[标签切换]
        T3[链接导航]
        T4[命令面板]
    end
    
    subgraph 状态
        S1[未选中]
        S2[选中]
        S3[选中+激活]
    end
    
    subgraph 视觉表现
        V1[默认样式]
        V2[背景高亮]
        V3[背景高亮+左侧标记]
    end
    
    T1 --> S2
    T2 --> S3
    T3 --> S3
    T4 --> S2
    
    S1 --> V1
    S2 --> V2
    S3 --> V3
    
    S2 -.失去焦点.-> S1
    S3 -.切换标签.-> S2
```

## 4. 编辑组(Pane)系统 - 布局状态

```mermaid
graph LR
    subgraph 初始状态
        A[单一编辑组]
    end
    
    subgraph 拆分操作
        B1[垂直拆分]
        B2[水平拆分]
    end
    
    subgraph 布局结果
        C1[左右分栏]
        C2[上下分栏]
        C3[复杂网格]
    end
    
    A -->|Ctrl+\| C1
    A -->|Ctrl+Shift+\| C2
    C1 -->|继续拆分| C3
    C2 -->|继续拆分| C3
    
    C3 -->|关闭面板| C1
    C3 -->|关闭面板| C2
    C1 -->|关闭面板| A
    C2 -->|关闭面板| A
```

## 5. 链接点击行为 - 决策树

```mermaid
graph TD
    A[检测链接点击] --> B{修饰键检测}
    
    B -->|无修饰键| C[当前标签导航]
    B -->|Ctrl/Cmd| D[新标签页打开]
    B -->|Ctrl+Shift| E[新窗口打开]
    B -->|Alt| F[显示预览]
    
    C --> G{文件是否存在}
    D --> G
    
    G -->|存在| H[加载文件]
    G -->|不存在| I{是否创建}
    
    I -->|是| J[创建新文件]
    I -->|否| K[显示错误]
    
    H --> L[更新文件树]
    J --> L
    
    L --> M[同步选中状态]
```

## 6. 未链接提及 - 数据流时序

```mermaid
sequenceDiagram
    participant Editor as 编辑器
    participant Parser as 内容解析器
    participant Index as 链接索引
    participant Calculator as 计算器
    participant FileTree as 文件树UI
    participant Timer as 定时器
    
    Editor->>Parser: 内容变更事件
    Parser->>Parser: 提取所有文本引用
    Parser->>Index: 更新引用列表
    
    Timer->>Timer: 等待500ms
    Timer->>Calculator: 触发批量计算
    
    Calculator->>Index: 查询所有文件引用
    Calculator->>Calculator: 计算未链接数量
    Calculator->>FileTree: 批量更新计数
    
    FileTree->>FileTree: 更新UI显示
    
    Note over Timer,Calculator: 批量处理避免频繁更新
```

## 7. 文件树与编辑器 - 完整状态同步

```mermaid
graph TB
    subgraph 文件树事件
        FE1[选中文件]
        FE2[删除文件]
        FE3[重命名]
        FE4[移动文件]
    end
    
    subgraph 同步中心
        SC[EventBus]
    end
    
    subgraph 编辑器响应
        ER1[高亮标签]
        ER2[关闭标签]
        ER3[更新标签标题]
        ER4[更新文件路径]
    end
    
    subgraph 编辑器事件
        EE1[激活标签]
        EE2[创建文件]
        EE3[保存新文件]
    end
    
    subgraph 文件树响应
        FR1[高亮文件]
        FR2[添加节点]
        FR3[刷新目录]
    end
    
    FE1 -->|file-selected| SC
    FE2 -->|file-deleted| SC
    FE3 -->|file-renamed| SC
    FE4 -->|file-moved| SC
    
    SC --> ER1
    SC --> ER2
    SC --> ER3
    SC --> ER4
    
    EE1 -->|tab-activated| SC
    EE2 -->|file-created| SC
    EE3 -->|file-saved| SC
    
    SC --> FR1
    SC --> FR2
    SC --> FR3
```

## 8. 拖拽标签 - 多场景处理

```mermaid
stateDiagram-v2
    [*] --> 开始拖拽
    
    开始拖拽 --> 拖拽中
    
    拖拽中 --> 检测释放位置
    
    检测释放位置 --> 同组重排: 标签栏内
    检测释放位置 --> 跨组移动: 其他编辑组
    检测释放位置 --> 创建窗口: 编辑器外
    检测释放位置 --> 取消操作: ESC键
    
    同组重排 --> 更新标签顺序
    跨组移动 --> 移动标签数据
    创建窗口 --> 生成新窗口
    取消操作 --> [*]
    
    更新标签顺序 --> [*]
    移动标签数据 --> 更新组焦点 --> [*]
    生成新窗口 --> [*]
```

## 9. 性能优化策略

```mermaid
graph LR
    subgraph 立即响应
        I1[UI状态更新]
        I2[视觉反馈]
        I3[临时节点]
    end
    
    subgraph 延迟处理
        D1[文件系统操作]
        D2[索引更新]
        D3[搜索重建]
    end
    
    subgraph 批量操作
        B1[未链接提及计算]
        B2[文件树刷新]
        B3[标签图标更新]
    end
    
    I1 -.异步.-> D1
    I2 --> B1
    I3 -.确认后.-> D1
    
    D1 --> B2
    D2 --> B1
    D3 -.定时器.-> B3
```

## 10. 错误处理流程

```mermaid
graph TD
    subgraph 错误类型
        E1[文件不存在]
        E2[权限不足]
        E3[名称冲突]
        E4[磁盘空间不足]
    end
    
    subgraph 处理策略
        H1[静默恢复]
        H2[提示确认]
        H3[错误对话框]
        H4[状态回滚]
    end
    
    E1 --> H2
    E2 --> H3
    E3 --> H1
    E4 --> H3
    
    H1 --> R1[自动重命名]
    H2 --> R2[创建文件选项]
    H3 --> R3[详细错误信息]
    H4 --> R4[撤销操作]
```