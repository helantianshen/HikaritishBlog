package config

import (
	"strings"
	"testing"
)

func TestLoadRequiresDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected DATABASE_URL validation error")
	}
}

func TestLoadParsesRuntimeConfiguration(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example.invalid/blog")
	t.Setenv("HTTP_ADDR", "127.0.0.1:9090")
	t.Setenv("CORS_ORIGINS", "https://one.example, https://two.example")
	t.Setenv("RUSTFS_ENDPOINT", "http://127.0.0.1:9000/")
	t.Setenv("RUSTFS_ACCESS_KEY", "access")
	t.Setenv("RUSTFS_SECRET_KEY", "secret")
	t.Setenv("RUSTFS_BUCKET", "images")
	t.Setenv("RUSTFS_PUBLIC_BASE_URL", "https://images.example/")
	t.Setenv("MAX_IMAGE_BYTES", "2048")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.HTTPAddr != "127.0.0.1:9090" {
		t.Fatalf("HTTPAddr = %q", cfg.HTTPAddr)
	}
	if len(cfg.AllowedOrigins) != 2 {
		t.Fatalf("AllowedOrigins = %#v", cfg.AllowedOrigins)
	}
	if !cfg.RustFS.Enabled() {
		t.Fatal("expected RustFS configuration to be enabled")
	}
	if cfg.RustFS.Endpoint != "http://127.0.0.1:9000" {
		t.Fatalf("RustFS endpoint = %q", cfg.RustFS.Endpoint)
	}
	if cfg.RustFS.MaxImageBytes != 2048 {
		t.Fatalf("MaxImageBytes = %d", cfg.RustFS.MaxImageBytes)
	}
}

func TestProductionRequiresAdminToken(t *testing.T) {
	cfg := Config{Environment: "production"}
	if err := cfg.ValidateProduction(); err == nil {
		t.Fatal("expected missing ADMIN_TOKEN error")
	}
	cfg.AdminToken = "short"
	if err := cfg.ValidateProduction(); err == nil {
		t.Fatal("expected short ADMIN_TOKEN error")
	}
	cfg.AdminToken = strings.Repeat("a", 32)
	if err := cfg.ValidateProduction(); err != nil {
		t.Fatalf("ValidateProduction() error = %v", err)
	}
}
