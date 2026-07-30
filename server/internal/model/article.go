package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	ArticleKindPost    = "post"
	ArticleKindChatter = "chatter"
	ArticleKindMoment  = "moment"
	ArticleKindPage    = "page"

	ArticleStatusDraft     = "draft"
	ArticleStatusPublished = "published"
	ArticleStatusArchived  = "archived"
)

type Article struct {
	ID           uint64         `json:"id" gorm:"primaryKey"`
	Kind         string         `json:"kind" gorm:"size:24;not null;index"`
	Status       string         `json:"status" gorm:"size:24;not null;index"`
	Slug         string         `json:"slug" gorm:"size:180;not null;uniqueIndex"`
	Title        string         `json:"title" gorm:"size:240;not null"`
	Summary      string         `json:"summary" gorm:"type:text"`
	Mood         string         `json:"mood" gorm:"size:80"`
	Location     string         `json:"location" gorm:"size:160"`
	CoverURL     string         `json:"coverUrl" gorm:"type:text"`
	Tags         []string       `json:"tags" gorm:"serializer:json;type:jsonb"`
	ImageURLs    []string       `json:"imageUrls" gorm:"serializer:json;type:jsonb"`
	ContentHTML  string         `json:"contentHtml,omitempty" gorm:"type:text"`
	RenderedHTML string         `json:"renderedHtml" gorm:"type:text"`
	PublishedAt  *time.Time     `json:"publishedAt" gorm:"index"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

type ArticleRevision struct {
	ID           uint64    `json:"id" gorm:"primaryKey"`
	ArticleID    uint64    `json:"articleId" gorm:"not null;index;uniqueIndex:idx_article_revision"`
	Revision     uint      `json:"revision" gorm:"not null;uniqueIndex:idx_article_revision"`
	Title        string    `json:"title" gorm:"size:240;not null"`
	Summary      string    `json:"summary" gorm:"type:text"`
	CoverURL     string    `json:"coverUrl" gorm:"type:text"`
	Tags         []string  `json:"tags" gorm:"serializer:json;type:jsonb"`
	ImageURLs    []string  `json:"imageUrls" gorm:"serializer:json;type:jsonb"`
	ContentHTML  string    `json:"contentHtml" gorm:"type:text"`
	RenderedHTML string    `json:"renderedHtml" gorm:"type:text"`
	CreatedAt    time.Time `json:"createdAt"`
}

func ValidArticleKind(value string) bool {
	switch value {
	case ArticleKindPost, ArticleKindChatter, ArticleKindMoment, ArticleKindPage:
		return true
	default:
		return false
	}
}

func ValidArticleStatus(value string) bool {
	switch value {
	case ArticleStatusDraft, ArticleStatusPublished, ArticleStatusArchived:
		return true
	default:
		return false
	}
}
