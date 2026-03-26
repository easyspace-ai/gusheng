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

	timeout := parseDurationEnv("STOCKAPI_PREWARM_TIMEOUT")
	if timeout <= 0 {
		timeout = 90 * time.Minute
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	report := &stocklib.PrewarmReport{}
	opts := stocklib.DefaultPrewarmOptions()
	opts.WarmQuotes = true
	opts.WarmHistory = true
	opts.HistoryStartDate = strings.TrimSpace(os.Getenv("STOCKAPI_PREWARM_HISTORY_START"))
	opts.HistoryEndDate = strings.TrimSpace(os.Getenv("STOCKAPI_PREWARM_HISTORY_END"))
	opts.Report = report

	opts.OnLog = func(msg string) {
		log.Printf("[stockapi-init] %s", msg)
	}

	switch raw := strings.TrimSpace(os.Getenv("STOCKAPI_PREWARM_LOG_EVERY")); raw {
	case "":
		opts.HistoryProgressEvery = 100
	case "0":
		opts.HistoryProgressEvery = 0
	default:
		if v := parseIntEnv("STOCKAPI_PREWARM_LOG_EVERY"); v > 0 {
			opts.HistoryProgressEvery = v
		} else {
			opts.HistoryProgressEvery = 100
		}
	}

	if v := parseIntEnv("STOCKAPI_PREWARM_RETRIES"); v > 0 {
		opts.HistoryMaxRetries = v
	} else {
		opts.HistoryMaxRetries = 3
	}
	if w := parseDurationEnv("STOCKAPI_PREWARM_RETRY_WAIT"); w > 0 {
		opts.HistoryRetryWait = w
	} else {
		opts.HistoryRetryWait = 2 * time.Second
	}

	opts.ValidateHistory = true
	if v := strings.ToLower(strings.TrimSpace(os.Getenv("STOCKAPI_PREWARM_VALIDATE"))); v == "0" || v == "false" || v == "no" {
		opts.ValidateHistory = false
	}

	if v := parseIntEnv("STOCKAPI_PREWARM_MIN_DAILY_BARS"); v > 0 {
		opts.MinDailyBars = v
	} else {
		opts.MinDailyBars = 120
	}

	if v := parseIntEnv("STOCKAPI_PREWARM_CONCURRENCY"); v > 0 {
		opts.HistoryConcurrency = v
	}

	start := time.Now()
	log.Printf("[stockapi-init] start data_dir=%s", dataDir)
	if err := client.Prewarm(ctx, opts); err != nil {
		log.Printf("[stockapi-init] report quotes_ok=%v history_total=%d ok=%d fail=%d validation_warn_symbols=%d",
			report.QuotesOK, report.HistoryTotal, report.HistorySuccess, report.HistoryFailed, report.ValidationWarnSymbols)
		if len(report.FailedSymbols) > 0 {
			n := len(report.FailedSymbols)
			if n > 30 {
				n = 30
			}
			for _, s := range report.FailedSymbols[:n] {
				log.Printf("[stockapi-init] failed_sample %s", s)
			}
			if len(report.FailedSymbols) > 30 {
				log.Printf("[stockapi-init] ... and %d more failures (truncated)", len(report.FailedSymbols)-30)
			}
		}
		log.Fatalf("[stockapi-init] failed: %v", err)
	}

	log.Printf("[stockapi-init] done in %s", time.Since(start).Round(time.Second))
	log.Printf("[stockapi-init] report quotes_ok=%v history_total=%d ok=%d fail=%d validation_warn_symbols=%d",
		report.QuotesOK, report.HistoryTotal, report.HistorySuccess, report.HistoryFailed, report.ValidationWarnSymbols)
}

func resolveDataDir() string {
	if dir := strings.TrimSpace(os.Getenv("STOCKAPI_DATA_DIR")); dir != "" {
		return dir
	}
	root := strings.TrimSpace(os.Getenv("OBSIDIAN_FS_ROOT"))
	if root == "" {
		root = "/data/myspace"
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
