package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	stocklib "github.com/easyspace-ai/tusharedb-go/pkg/stockapi"
)

func main() {
	dataDir := resolveDataDir()
	client, err := stocklib.NewClientWithConfig(buildStockAPIConfig(dataDir))
	if err != nil {
		log.Fatalf("failed to init stockapi client: %v", err)
	}
	log.Printf("[stockapi-cron] started, data_dir=%s", dataDir)

	// 启动即执行一次，避免重启后当天一直未刷新。
	runOnce(client, "startup")
	for {
		wait := durationUntilDaily(strings.TrimSpace(os.Getenv("STOCKAPI_PREWARM_AT")))
		log.Printf("[stockapi-cron] next run in %s", wait.Round(time.Second))
		time.Sleep(wait)
		runOnce(client, "daily")
	}
}

func runOnce(client *stocklib.Client, trigger string) {
	timeout := parseDurationEnv("STOCKAPI_PREWARM_TIMEOUT")
	if timeout <= 0 {
		timeout = 60 * time.Minute
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	opts := stocklib.DefaultPrewarmOptions()
	opts.WarmQuotes = true
	opts.WarmHistory = true
	opts.HistoryStartDate = strings.TrimSpace(os.Getenv("STOCKAPI_PREWARM_HISTORY_START"))
	opts.HistoryEndDate = strings.TrimSpace(os.Getenv("STOCKAPI_PREWARM_HISTORY_END"))
	if v := parseIntEnv("STOCKAPI_PREWARM_CONCURRENCY"); v > 0 {
		opts.HistoryConcurrency = v
	}

	start := time.Now()
	log.Printf("[stockapi-cron] %s prewarm started", trigger)
	if err := client.Prewarm(ctx, opts); err != nil {
		log.Printf("[stockapi-cron] %s prewarm failed: %v", trigger, err)
		return
	}
	log.Printf("[stockapi-cron] %s prewarm done in %s", trigger, time.Since(start).Round(time.Second))
}

func durationUntilDaily(hhmm string) time.Duration {
	now := time.Now()
	target := time.Date(now.Year(), now.Month(), now.Day(), 9, 5, 0, 0, now.Location())
	if hhmm != "" {
		parts := strings.Split(hhmm, ":")
		if len(parts) == 2 {
			if h, err := strconv.Atoi(strings.TrimSpace(parts[0])); err == nil {
				if m, err := strconv.Atoi(strings.TrimSpace(parts[1])); err == nil {
					target = time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, now.Location())
				}
			}
		}
	}
	if !target.After(now) {
		target = target.Add(24 * time.Hour)
	}
	return target.Sub(now)
}

func resolveDataDir() string {
	if dir := strings.TrimSpace(os.Getenv("STOCKAPI_DATA_DIR")); dir != "" {
		return dir
	}
	root := strings.TrimSpace(os.Getenv("OBSIDIAN_FS_ROOT"))
	if root == "" {
		root = "/data/workspace"
	}
	return filepath.Join(root, "data")
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
