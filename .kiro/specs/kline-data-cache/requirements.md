# 需求文档

## 简介

本功能旨在优化选股场景下的 K 线数据加载性能。当前方案中，前端选股页面通过 Python FastAPI 后端的 `/v1/market/kline` 接口获取 K 线数据，后端每次都通过 akshare 等第三方库实时从网络拉取，导致选股时 K 线加载非常慢。

项目中已有一个 Golang 服务（`server/`），内置了东方财富 K 线 API 客户端（`eastmoney.Client`）和 SQLite 多层缓存（内存 + 磁盘），但目前缺少日线数据的持久化磁盘缓存机制。

本功能的目标是：在 Golang 服务中实现日线 K 线数据的本地磁盘持久化缓存，并通过 Golang 服务对外暴露一个与现有 Python 接口兼容的 K 线数据接口，使前端选股场景可以直接命中本地缓存，大幅提升加载速度。

---

## 词汇表

- **KLine_Cache**：本地日线 K 线数据缓存服务，运行于 Golang 服务内部
- **KLine_API**：Golang 服务对外暴露的 K 线数据 HTTP 接口
- **EastMoney_Client**：已有的东方财富 K 线数据拉取客户端（`server/internal/infrastructure/clients/eastmoney/`）
- **SQLite_Store**：已有的 SQLite 持久化缓存层（`server/internal/infrastructure/cache/sqlite_cache.go`）
- **Daily_Candle**：日线 K 线数据条目，包含日期、开盘价、收盘价、最高价、最低价、成交量、成交额、涨跌额、涨跌幅、换手率
- **Symbol**：股票代码，格式为 `XXXXXX.SH` 或 `XXXXXX.SZ`（如 `600519.SH`），或指数代码（如 `000001.SH`）
- **Trading_Day**：A 股交易日，非交易日不产生新数据
- **Stale_Data**：当日交易时段结束后（15:00 之后）已收盘的数据，次日起视为历史数据，可长期缓存
- **Python_Backend**：现有的 Python FastAPI 后端，通过 akshare 实时拉取数据

---

## 需求

### 需求 1：日线 K 线数据本地持久化缓存

**用户故事：** 作为选股功能的使用者，我希望 K 线数据能从本地缓存快速加载，而不是每次都等待网络请求，以便选股时能流畅地切换和查看多只股票的 K 线图。

#### 验收标准

1. THE KLine_Cache SHALL 将从 EastMoney_Client 获取的 Daily_Candle 数据持久化存储到 SQLite_Store 中。
2. WHEN KLine_API 收到对某 Symbol 的日线数据请求，THE KLine_Cache SHALL 优先从 SQLite_Store 中读取已缓存的 Daily_Candle 数据。
3. WHEN SQLite_Store 中存在目标 Symbol 的完整日期范围缓存，THE KLine_Cache SHALL 直接返回缓存数据，不发起网络请求。
4. WHEN SQLite_Store 中缺少目标 Symbol 的部分或全部日期范围数据，THE KLine_Cache SHALL 仅对缺失的日期范围向 EastMoney_Client 发起补充请求，并将新数据合并写入 SQLite_Store。
5. THE SQLite_Store SHALL 以 Symbol 和日期（`YYYY-MM-DD`）为联合主键存储 Daily_Candle 数据，确保同一 Symbol 同一日期不重复写入。

---

### 需求 2：Golang K 线数据接口

**用户故事：** 作为前端开发者，我希望通过一个稳定的 HTTP 接口获取日线 K 线数据，并且该接口的响应格式与现有 Python 接口保持兼容，以便无需修改前端代码即可切换数据来源。

#### 验收标准

1. THE KLine_API SHALL 在 Golang 服务中暴露 `GET /api/kline` 接口，接受 `symbol`、`start_date`（`YYYY-MM-DD`）、`end_date`（`YYYY-MM-DD`）三个查询参数。
2. WHEN `symbol` 参数为空，THE KLine_API SHALL 返回 HTTP 400 状态码及描述性错误信息。
3. WHEN `start_date` 或 `end_date` 格式不符合 `YYYY-MM-DD`，THE KLine_API SHALL 返回 HTTP 400 状态码及描述性错误信息。
4. WHEN 请求成功，THE KLine_API SHALL 返回 JSON 响应，结构与 Python 后端 `/v1/market/kline` 接口一致，包含 `symbol`、`start_date`、`end_date`、`candles` 字段，其中 `candles` 为 Daily_Candle 数组。
5. WHEN 指定 Symbol 和日期范围内无任何数据，THE KLine_API SHALL 返回 HTTP 404 状态码。
6. WHEN EastMoney_Client 请求失败且 SQLite_Store 中存在部分缓存数据，THE KLine_API SHALL 返回已缓存的部分数据，并在响应中标注数据不完整。
7. IF EastMoney_Client 请求失败且 SQLite_Store 中无任何缓存数据，THEN THE KLine_API SHALL 返回 HTTP 502 状态码及描述性错误信息。

---

### 需求 3：缓存数据的时效性管理

**用户故事：** 作为系统维护者，我希望缓存数据能自动区分历史数据和当日数据的时效性，以便历史日线数据长期有效，而当日数据在收盘后才被固化，避免返回错误的实时数据。

#### 验收标准

1. THE KLine_Cache SHALL 对日期早于当日的 Daily_Candle 数据视为永久有效的历史数据，不设过期时间。
2. WHEN 请求包含当日日期，THE KLine_Cache SHALL 检查当前时间是否晚于 15:30（北京时间），若是则将当日数据视为已收盘的历史数据缓存；若否则重新从 EastMoney_Client 拉取当日数据。
3. THE KLine_Cache SHALL 提供手动清除指定 Symbol 缓存的能力，以便在数据异常时可以强制刷新。

---

### 需求 4：缓存数据格式的序列化与反序列化

**用户故事：** 作为开发者，我希望 Daily_Candle 数据在写入和读取 SQLite_Store 时能保持数值精度和字段完整性，以便 K 线图渲染时不出现数据失真。

#### 验收标准

1. THE KLine_Cache SHALL 将 Daily_Candle 的所有价格字段（open、high、low、close）以 REAL 类型存储，精度不低于小数点后 4 位。
2. THE KLine_Cache SHALL 将 Daily_Candle 的成交量（volume）以 INTEGER 类型存储。
3. THE KLine_Cache SHALL 将 Daily_Candle 的涨跌幅（change_percent）、换手率（turnover_rate）以 REAL 类型存储，允许为 NULL。
4. FOR ALL Daily_Candle 数据，将其写入 SQLite_Store 后再读取，THE KLine_Cache SHALL 返回与写入时数值相等的数据（往返一致性）。
5. THE KLine_Cache SHALL 在读取时将 SQLite_Store 中的数据正确映射为 KLine_API 响应所需的 JSON 字段名（`date`、`open`、`high`、`low`、`close`、`volume`、`amount`、`change`、`change_percent`、`turnover_rate`）。

---

### 需求 5：前端选股页面接入 Golang K 线接口

**用户故事：** 作为前端开发者，我希望选股页面的 K 线图能优先使用 Golang 本地缓存接口，以便在不修改渲染逻辑的前提下获得更快的加载速度。

#### 验收标准

1. THE KLine_API SHALL 支持与现有前端 `api.getKline(symbol, startDate, endDate)` 调用完全兼容的响应格式，使前端无需修改 `KlinePanel` 组件即可切换数据来源。
2. WHEN 前端通过 Golang 服务的 `/api/kline` 接口请求数据，THE KLine_API SHALL 在缓存命中时于 200ms 内返回响应。
3. WHERE 前端配置了 `VITE_API_URL` 指向 Golang 服务，THE KLine_API SHALL 通过统一的 `/api/kline` 路径提供服务，无需前端区分数据来源。
