package proxy

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"obsidianfs/internal/auth"

	"github.com/gin-gonic/gin"
)

func tradingAPIBaseURL() string {
	if v := strings.TrimSpace(os.Getenv("TRADINGAPI_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:8000"
}

func ReverseProxyHandler() gin.HandlerFunc {
	target, err := url.Parse(tradingAPIBaseURL())
	if err != nil {
		panic(fmt.Sprintf("invalid TRADINGAPI_URL: %v", err))
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		if req.Header.Get("X-User-Id") == "" {
			user := auth.UserFromBearer(req.Header.Get("Authorization"))
			req.Header.Set("X-User-Id", user.ID)
			req.Header.Set("X-User-Email", user.Email)
			req.Header.Set("X-User-Name", user.Name)
			req.Header.Set("X-User-Role", user.Role)
		}
	}

	proxy.ModifyResponse = func(resp *http.Response) error {
		// Keep the browser-facing response CORS headers owned by Go only.
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Credentials")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Expose-Headers")
		return nil
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		if errors.Is(err, http.ErrAbortHandler) {
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"detail": fmt.Sprintf("trading proxy error: %v", err),
		})
	}

	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				if err, ok := rec.(error); ok && errors.Is(err, http.ErrAbortHandler) {
					c.Abort()
					return
				}
				panic(rec)
			}
		}()
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}
