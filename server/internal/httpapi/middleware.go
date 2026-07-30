package httpapi

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func cors(origins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		allowed[origin] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allowed[origin]; ok {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Vary", "Origin")
				c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
				c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			}
		}

		if c.Request.Method == http.MethodOptions {
			if origin == "" {
				c.Status(http.StatusNoContent)
				c.Abort()
				return
			}
			if _, ok := allowed[origin]; !ok {
				fail(c, http.StatusForbidden, "origin_not_allowed", "请求来源不被允许")
				return
			}
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}
		c.Next()
	}
}

func requireAdminToken(expected string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if expected == "" {
			c.Next()
			return
		}

		actual := strings.TrimSpace(c.GetHeader("X-Admin-Token"))
		if actual == "" {
			authorization := strings.TrimSpace(c.GetHeader("Authorization"))
			if strings.HasPrefix(authorization, "Bearer ") {
				actual = strings.TrimSpace(strings.TrimPrefix(authorization, "Bearer "))
			}
		}

		if len(actual) != len(expected) ||
			subtle.ConstantTimeCompare([]byte(actual), []byte(expected)) != 1 {
			fail(c, http.StatusUnauthorized, "unauthorized", "管理凭证无效")
			return
		}
		c.Next()
	}
}
