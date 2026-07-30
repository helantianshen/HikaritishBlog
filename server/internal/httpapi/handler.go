package httpapi

import (
	"log/slog"

	"hikaritish.blog/server/internal/content"
	"hikaritish.blog/server/internal/storage"

	"gorm.io/gorm"
)

type Handler struct {
	db        *gorm.DB
	logger    *slog.Logger
	sanitizer *content.Sanitizer
	storage   *storage.RustFS
}

func NewHandler(
	db *gorm.DB,
	logger *slog.Logger,
	sanitizer *content.Sanitizer,
	objectStorage *storage.RustFS,
) *Handler {
	return &Handler{
		db:        db,
		logger:    logger,
		sanitizer: sanitizer,
		storage:   objectStorage,
	}
}
