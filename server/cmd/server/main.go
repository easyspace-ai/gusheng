package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	mdlib "github.com/easyspace-ai/tusharedb-go/pkg/marketdata"
	stocklib "github.com/easyspace-ai/tusharedb-go/pkg/stockapi"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	legacyapi "obsidianfs/internal/api"
	"obsidianfs/internal/application/ai"
	"obsidianfs/internal/auth"
	"obsidianfs/internal/filesystem"
	"obsidianfs/internal/infrastructure/cache"
	"obsidianfs/internal/infrastructure/clients"
	"obsidianfs/internal/infrastructure/marketadapter"
	"obsidianfs/internal/infrastructure/persistence/sqlite"
	"obsidianfs/internal/infrastructure/persistence/stockdb"
	stockapi "obsidianfs/internal/interfaces/api"
	"obsidianfs/internal/plugins"
	"obsidianfs/internal/proxy"
	"obsidianfs/internal/tags"
	"obsidianfs/internal/ws"
)

func main() {
	root := os.Getenv("OBSIDIAN_FS_ROOT")
	if root == "" {
		root = filepath.Join("/data/workspace")
	}
	fmt.Println("root", root)

	if err := os.MkdirAll(root, 0o755); err != nil {
		log.Fatalf("failed to ensure data root: %v", err)
	}
	docPath := filepath.Join(root, "data")
	dataDir := filepath.Join(root, "data")

	// ========== 原有服务初始化 ==========
	fsService, err := filesystem.NewService(docPath)
	if err != nil {
		log.Fatalf("failed to init filesystem service: %v", err)
	}

	indexer := tags.NewIndexer(root)
	if err := indexer.ReindexAll(); err != nil {
		log.Printf("tag indexer initial build failed: %v", err)
	}

	hub := ws.NewHub()
	go hub.Run()

	pluginsDir := filepath.Join(root, ".plugins")
	pluginDbPath := filepath.Join(root, ".plugins.db")
	pluginService, err := plugins.NewService(pluginDbPath, pluginsDir)
	if err != nil {
		log.Printf("plugin system disabled: %v", err)
	}
	defer func() {
		if pluginService != nil {
			pluginService.Close()
		}
	}()

	watcher, err := filesystem.NewWatcher(root, hub, indexer)
	if err != nil {
		log.Printf("fs watcher disabled: %v", err)
	} else {
		go watcher.Run()
		defer watcher.Close()
	}

	// ========== 新增：股票相关服务初始化 ==========

	// 1. 初始化配置
	config := clients.DefaultConfig()
	if token := os.Getenv("TUSHARE_TOKEN"); token != "" {
		config.TushareToken = token
	}

	// 2. 初始化缓存层
	cacheLayer, err := cache.NewMultiLayerCache(dataDir)
	if err != nil {
		log.Printf("cache layer disabled: %v", err)
	}
	defer func() {
		if cacheLayer != nil {
			cacheLayer.Close()
		}
	}()

	// 3. 初始化股票数据库
	stockDB, err := stockdb.InitStockDatabase(dataDir)
	if err != nil {
		log.Printf("stock database disabled: %v", err)
	}

	// 4. 初始化仓储和服务
	stockRepo := sqlite.NewStockRepository(stockDB, cacheLayer, config)
	mdCfg := mdlib.DefaultConfig()
	if config.CrawlTimeOut > 0 {
		mdCfg.Timeout = time.Duration(config.CrawlTimeOut) * time.Second
	}
	marketRepo := marketadapter.NewRepository(mdlib.NewClient(mdCfg))
	aiService := ai.NewAIService()

	// 5. 初始化 API handlers
	stockHandler := stockapi.NewStockHandler(stockRepo)
	stockV1Client, err := stocklib.NewClientWithConfig(buildStockAPIConfig(dataDir))
	if err != nil {
		log.Fatalf("failed to init stockapi client: %v", err)
	}
	stockV1Handler := stockapi.NewStockV1Handler(stockV1Client)
	marketHandler := stockapi.NewMarketHandler(marketRepo)
	aiHandler := stockapi.NewAIHandler(aiService)

	// ========== Gin 路由配置 ==========

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-Id", "X-User-Id", "X-User-Email", "X-User-Name", "X-User-Role"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// 健康检查（统一）
	r.GET("/api/health", stockapi.Health)
	r.GET("/api/vip-status", stockapi.GetVipStatus)

	authDBPath := filepath.Join(root, "data", "auth.db")
	jwtSecret := strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET"))
	if jwtSecret == "" {
		jwtSecret = "dev-insecure-jwt-secret-change-me"
		log.Println("WARNING: AUTH_JWT_SECRET is empty; set it for production")
	}
	authSvc, err := auth.NewService(authDBPath, jwtSecret)
	if err != nil {
		log.Fatalf("auth: %v", err)
	}
	defer func() {
		_ = authSvc.Close()
	}()
	auth.RegisterRoutes(r.Group("/api/auth"), authSvc)

	// TradingAPI 代理
	r.Any("/v1/*path", proxy.ReverseProxyHandler())
	r.Any("/api/backtest/*path", proxy.BacktestReverseProxyHandler())

	// ========== API 路由分组 ==========

	apiGroup := r.Group("/api")

	// 原有 API 路由
	legacyapi.RegisterRoutes(apiGroup, fsService, hub, indexer, root)

	// 新增：股票、市场、AI API 路由
	stockHandler.RegisterRoutes(apiGroup)
	marketHandler.RegisterRoutes(apiGroup)
	aiHandler.RegisterRoutes(apiGroup)
	stockV1Handler.RegisterRoutes(r.Group("/api/v1"))

	// 插件 API
	if pluginService != nil {
		plugins.RegisterPluginRoutes(apiGroup, pluginService)
	}

	// WebSocket
	r.GET("/ws", func(c *gin.Context) {
		ws.ServeWS(hub, c.Writer, c.Request)
	})

	addr := ":8787"
	if env := os.Getenv("PORT"); env != "" {
		addr = ":" + env
	}
	log.Printf("server listening on %s, root=%s", addr, root)
	log.Printf("API endpoints available: /api/stock, /api/market, /api/ai, /api/agent")
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func buildStockAPIConfig(defaultDataDir string) stocklib.Config {
	cfg := stocklib.DefaultConfig()

	if mode := strings.TrimSpace(os.Getenv("STOCKAPI_CACHE_MODE")); mode != "" {
		switch strings.ToLower(mode) {
		case "disabled":
			cfg.CacheMode = stocklib.CacheModeDisabled
		case "readonly":
			cfg.CacheMode = stocklib.CacheModeReadOnly
		default:
			cfg.CacheMode = stocklib.CacheModeAuto
		}
	}

	if dir := strings.TrimSpace(os.Getenv("STOCKAPI_DATA_DIR")); dir != "" {
		cfg.DataDir = dir
	} else {
		cfg.DataDir = defaultDataDir
	}

	if v := parseDurationEnv("STOCKAPI_QUOTES_TTL"); v > 0 {
		cfg.QuotesTTL = v
	}
	if v := parseDurationEnv("STOCKAPI_HISTORY_TTL"); v > 0 {
		cfg.HistoryTTL = v
	}
	if v := parseDurationEnv("STOCKAPI_TIMELINE_TTL"); v > 0 {
		cfg.TimelineTTL = v
	}
	if v := parseIntEnv("STOCKAPI_BATCH_SIZE"); v > 0 {
		cfg.BatchSize = v
	}
	if v := parseIntEnv("STOCKAPI_CONCURRENCY"); v > 0 {
		cfg.Concurrency = v
	}

	return cfg
}

func parseDurationEnv(key string) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return 0
	}
	v, err := time.ParseDuration(raw)
	if err != nil {
		return 0
	}
	return v
}

func parseIntEnv(key string) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return 0
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 0
	}
	return v
}
