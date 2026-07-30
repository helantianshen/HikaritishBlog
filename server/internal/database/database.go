package database

import (
	"fmt"
	"log/slog"
	"time"

	"hikaritish.blog/server/internal/model"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(databaseURL string, appLogger *slog.Logger) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get postgres pool: %w", err)
	}
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := db.AutoMigrate(
		&model.Article{},
		&model.ArticleRevision{},
		&model.SiteSettings{},
		&model.Friend{},
		&model.Project{},
		&model.Album{},
		&model.Photo{},
		&model.Asset{},
	); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
	}

	if err := ensureSettings(db); err != nil {
		return nil, err
	}

	appLogger.Info("database migrations completed")
	return db, nil
}

func ensureSettings(db *gorm.DB) error {
	defaults := model.DefaultSiteSettings()
	result := db.FirstOrCreate(&defaults, model.SiteSettings{ID: 1})
	if result.Error != nil {
		return fmt.Errorf("seed site settings: %w", result.Error)
	}
	return nil
}
