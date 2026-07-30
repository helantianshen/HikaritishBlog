package model

import (
	"time"

	"gorm.io/gorm"
)

type Friend struct {
	ID          uint64         `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"size:160;not null"`
	URL         string         `json:"url" gorm:"type:text;not null"`
	AvatarURL   string         `json:"avatarUrl" gorm:"type:text"`
	Description string         `json:"description" gorm:"type:text"`
	ThemeColor  string         `json:"themeColor" gorm:"size:80"`
	SortOrder   int            `json:"sortOrder" gorm:"not null;default:0;index"`
	Visible     bool           `json:"visible" gorm:"not null;index"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type Project struct {
	ID          uint64         `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"size:200;not null"`
	Description string         `json:"description" gorm:"type:text"`
	URL         string         `json:"url" gorm:"type:text"`
	RepoURL     string         `json:"repoUrl" gorm:"type:text"`
	CoverURL    string         `json:"coverUrl" gorm:"type:text"`
	Icon        string         `json:"icon" gorm:"size:80"`
	Tags        []string       `json:"tags" gorm:"serializer:json;type:jsonb"`
	SortOrder   int            `json:"sortOrder" gorm:"not null;default:0;index"`
	Visible     bool           `json:"visible" gorm:"not null;index"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type Album struct {
	ID          uint64         `json:"id" gorm:"primaryKey"`
	Slug        string         `json:"slug" gorm:"size:180;not null;uniqueIndex"`
	Name        string         `json:"name" gorm:"size:200;not null"`
	Description string         `json:"description" gorm:"type:text"`
	CoverURL    string         `json:"coverUrl" gorm:"type:text"`
	DisplayDate string         `json:"displayDate" gorm:"size:80"`
	SortOrder   int            `json:"sortOrder" gorm:"not null;default:0;index"`
	Visible     bool           `json:"visible" gorm:"not null;index"`
	Photos      []Photo        `json:"photos" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type Photo struct {
	ID           uint64     `json:"id" gorm:"primaryKey"`
	AlbumID      uint64     `json:"albumId" gorm:"not null;index"`
	URL          string     `json:"url" gorm:"type:text;not null"`
	ThumbnailURL string     `json:"thumbnailUrl" gorm:"type:text"`
	Alt          string     `json:"alt" gorm:"size:300"`
	Caption      string     `json:"caption" gorm:"type:text"`
	TakenAt      *time.Time `json:"takenAt"`
	SortOrder    int        `json:"sortOrder" gorm:"not null;default:0;index"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type Asset struct {
	ID           uint64         `json:"id" gorm:"primaryKey"`
	ObjectKey    string         `json:"objectKey" gorm:"size:500;not null;uniqueIndex"`
	PublicURL    string         `json:"publicUrl" gorm:"type:text;not null"`
	MIMEType     string         `json:"mimeType" gorm:"size:120;not null"`
	SizeBytes    int64          `json:"sizeBytes" gorm:"not null"`
	Width        int            `json:"width"`
	Height       int            `json:"height"`
	OriginalName string         `json:"originalName" gorm:"size:300"`
	CreatedAt    time.Time      `json:"createdAt"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}
