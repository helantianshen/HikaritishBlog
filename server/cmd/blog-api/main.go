package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"hikaritish.blog/server/internal/config"
	"hikaritish.blog/server/internal/content"
	"hikaritish.blog/server/internal/database"
	"hikaritish.blog/server/internal/httpapi"
	"hikaritish.blog/server/internal/storage"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	command := ""
	if len(os.Args) > 2 {
		logger.Error("unexpected command arguments")
		os.Exit(2)
	}
	if len(os.Args) == 2 {
		command = os.Args[1]
		if command != "init-storage" {
			logger.Error("unknown command", "command", command)
			os.Exit(2)
		}
	}

	cfg, err := config.Load()
	if err != nil {
		logger.Error("invalid configuration", "error", err)
		os.Exit(1)
	}
	if err := cfg.ValidateProduction(); err != nil {
		logger.Error("invalid production configuration", "error", err)
		os.Exit(1)
	}

	objectStorage, err := storage.NewRustFS(context.Background(), cfg.RustFS)
	if err != nil {
		logger.Error("rustfs startup failed", "error", err)
		os.Exit(1)
	}
	if command == "init-storage" {
		if err := objectStorage.EnsureBucket(context.Background()); err != nil {
			logger.Error("rustfs initialization failed", "error", err)
			os.Exit(1)
		}
		logger.Info(
			"rustfs bucket is ready; existing objects were not changed",
			"bucket",
			cfg.RustFS.Bucket,
		)
		return
	}

	db, err := database.Open(cfg.DatabaseURL, logger)
	if err != nil {
		logger.Error("database startup failed", "error", err)
		os.Exit(1)
	}
	if !objectStorage.Enabled() {
		logger.Warn("rustfs is not configured; image upload endpoints will return 503")
	}

	handler := httpapi.NewHandler(db, logger, content.NewSanitizer(), objectStorage)
	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           httpapi.NewRouter(cfg, handler),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	shutdownSignals := make(chan os.Signal, 1)
	signal.Notify(shutdownSignals, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-shutdownSignals
		logger.Info("shutdown signal received")
		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			logger.Error("graceful shutdown failed", "error", err)
		}
	}()

	logger.Info("blog api listening", "address", cfg.HTTPAddr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("http server stopped unexpectedly", "error", err)
		os.Exit(1)
	}
	logger.Info("blog api stopped")
}
