package proxy

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const backtestProxyPrefix = "/api/backtest"

func backtestAPIBaseURL() string {
	if v := strings.TrimSpace(os.Getenv("BACKTESTAPI_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:8100"
}

func BacktestReverseProxyHandler() gin.HandlerFunc {
	target, err := url.Parse(backtestAPIBaseURL())
	if err != nil {
		panic(fmt.Sprintf("invalid BACKTESTAPI_URL: %v", err))
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = strings.TrimPrefix(req.URL.Path, backtestProxyPrefix)
		if req.URL.Path == "" {
			req.URL.Path = "/"
		}
		req.URL.RawPath = req.URL.Path
	}

	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Credentials")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Expose-Headers")
		return nil
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"detail": fmt.Sprintf("backtest proxy error: %v", err),
		})
	}

	return gin.WrapH(proxy)
}
