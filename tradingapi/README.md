p# TradingAPI

这是从 `TradingAgents-AShare` 拆出来的独立 A 股投研后端。

## 目录结构

- `api/`：FastAPI 接口、数据库、任务调度、报告与认证服务
- `tradingagents/`：多智能体分析引擎、数据流、LLM 客户端、提示词

## 本地启动

```bash
cd tradingapi
uv sync
uv run tradingapi-api
```

默认监听：

- `http://localhost:8000`

可通过环境变量修改端口：

- `TRADINGAPI_PORT=8001`

## 环境变量

最少需要配置：

```env
TA_API_KEY=你的密钥
TA_BASE_URL=https://api.openai.com/v1
DATABASE_URL=sqlite:///./tradingagents.db
```

开发阶段默认会关闭 Python 侧鉴权；如果你想显式控制，可添加：

```env
TRADINGAPI_DISABLE_AUTH=1
```

## 与现有系统并行

你可以同时运行：

- 现有 Go `server`：负责笔记工作台
- `tradingapi`：负责股票分析、任务流、研报与聊天接口

前端后续只需要把分析页的请求地址切到 `tradingapi` 即可。
