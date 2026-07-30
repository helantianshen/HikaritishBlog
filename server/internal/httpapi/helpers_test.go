package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestValidSlug(t *testing.T) {
	valid := []string{"hello-world", "about", "文章-2026", "a_b.c~d"}
	for _, value := range valid {
		if !validSlug(value) {
			t.Fatalf("expected valid slug: %q", value)
		}
	}

	invalid := []string{"", " two words ", "/root", "a/b", "a..b", "-start", "end-", "what?", "hash#"}
	for _, value := range invalid {
		if validSlug(value) {
			t.Fatalf("expected invalid slug: %q", value)
		}
	}
}

func TestValidateArticleInput(t *testing.T) {
	valid := articleInput{Kind: "post", Slug: "hello-world", Title: "Hello"}
	if message := validateArticleInput(valid); message != "" {
		t.Fatalf("valid article rejected: %s", message)
	}

	tests := []articleInput{
		{Kind: "unknown", Slug: "hello", Title: "Hello"},
		{Kind: "post", Slug: "hello", Title: " "},
		{Kind: "post", Slug: "bad/path", Title: "Hello"},
	}
	for _, input := range tests {
		if message := validateArticleInput(input); message == "" {
			t.Fatalf("invalid article accepted: %#v", input)
		}
	}
}

func TestCompactStrings(t *testing.T) {
	got := compactStrings([]string{" Go ", "", "Gin", "Go", " Gin "})
	if len(got) != 2 || got[0] != "Go" || got[1] != "Gin" {
		t.Fatalf("compactStrings() = %#v", got)
	}
}

func TestRequireAdminToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(requireAdminToken("secret"))
	router.GET("/", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	unauthorized := httptest.NewRecorder()
	router.ServeHTTP(unauthorized, httptest.NewRequest(http.MethodGet, "/", nil))
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("missing token status = %d", unauthorized.Code)
	}

	authorizedRequest := httptest.NewRequest(http.MethodGet, "/", nil)
	authorizedRequest.Header.Set("Authorization", "Bearer secret")
	authorized := httptest.NewRecorder()
	router.ServeHTTP(authorized, authorizedRequest)
	if authorized.Code != http.StatusNoContent {
		t.Fatalf("valid token status = %d", authorized.Code)
	}
}

func TestPaginationBounds(t *testing.T) {
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(
		http.MethodGet,
		"/?page=-1&pageSize=500",
		nil,
	)
	page, pageSize := pagination(context)
	if page != 1 || pageSize != 100 {
		t.Fatalf("pagination() = %d, %d", page, pageSize)
	}
}
