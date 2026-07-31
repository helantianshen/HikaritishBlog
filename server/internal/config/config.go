package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment     string
	HTTPAddr        string
	DatabaseURL     string
	AllowedOrigins  []string
	AdminToken      string
	ShutdownTimeout time.Duration
	RustFS          RustFSConfig
}

type RustFSConfig struct {
	Endpoint         string
	InternalEndpoint string
	Region           string
	AccessKey        string
	SecretKey        string
	Bucket           string
	PublicBaseURL    string
	UsePathStyle     bool
	MaxImageBytes    int64
}

func Load() (Config, error) {
	rustFSEndpoint := strings.TrimRight(strings.TrimSpace(os.Getenv("RUSTFS_ENDPOINT")), "/")
	rustFSInternalEndpoint := strings.TrimRight(
		strings.TrimSpace(os.Getenv("RUSTFS_INTERNAL_ENDPOINT")),
		"/",
	)
	if rustFSInternalEndpoint == "" {
		rustFSInternalEndpoint = rustFSEndpoint
	}

	cfg := Config{
		Environment:     env("APP_ENV", "development"),
		HTTPAddr:        env("HTTP_ADDR", "127.0.0.1:8080"),
		DatabaseURL:     strings.TrimSpace(os.Getenv("DATABASE_URL")),
		AllowedOrigins:  splitCSV(os.Getenv("CORS_ORIGINS")),
		AdminToken:      strings.TrimSpace(os.Getenv("ADMIN_TOKEN")),
		ShutdownTimeout: durationEnv("SHUTDOWN_TIMEOUT", 10*time.Second),
		RustFS: RustFSConfig{
			Endpoint:         rustFSEndpoint,
			InternalEndpoint: rustFSInternalEndpoint,
			Region:           env("RUSTFS_REGION", "us-east-1"),
			AccessKey:        strings.TrimSpace(os.Getenv("RUSTFS_ACCESS_KEY")),
			SecretKey:        strings.TrimSpace(os.Getenv("RUSTFS_SECRET_KEY")),
			Bucket:           strings.TrimSpace(os.Getenv("RUSTFS_BUCKET")),
			PublicBaseURL:    strings.TrimRight(strings.TrimSpace(os.Getenv("RUSTFS_PUBLIC_BASE_URL")), "/"),
			UsePathStyle:     boolEnv("RUSTFS_USE_PATH_STYLE", true),
			MaxImageBytes:    int64Env("MAX_IMAGE_BYTES", 10*1024*1024),
		},
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if cfg.ShutdownTimeout <= 0 {
		return Config{}, errors.New("SHUTDOWN_TIMEOUT must be positive")
	}
	if cfg.RustFS.MaxImageBytes <= 0 {
		return Config{}, errors.New("MAX_IMAGE_BYTES must be positive")
	}

	return cfg, nil
}

func (c RustFSConfig) Enabled() bool {
	return c.Endpoint != "" &&
		c.AccessKey != "" &&
		c.SecretKey != "" &&
		c.Bucket != "" &&
		c.PublicBaseURL != ""
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if item := strings.TrimSpace(part); item != "" {
			result = append(result, item)
		}
	}
	return result
}

func boolEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func int64Env(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func (c Config) ValidateProduction() error {
	if c.Environment != "production" {
		return nil
	}
	if c.AdminToken == "" {
		return fmt.Errorf("ADMIN_TOKEN is required in production")
	}
	if len(c.AdminToken) < 32 {
		return fmt.Errorf("ADMIN_TOKEN must be at least 32 characters in production")
	}
	return nil
}
