package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"hikaritish.blog/server/internal/model"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

type articleInput struct {
	Kind        string   `json:"kind"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Summary     string   `json:"summary"`
	Mood        string   `json:"mood"`
	Location    string   `json:"location"`
	CoverURL    string   `json:"coverUrl"`
	Tags        []string `json:"tags"`
	ImageURLs   []string `json:"imageUrls"`
	ContentHTML string   `json:"contentHtml"`
}

type publicArticle struct {
	ID           uint64     `json:"id"`
	Kind         string     `json:"kind"`
	Slug         string     `json:"slug"`
	Title        string     `json:"title"`
	Summary      string     `json:"summary"`
	Mood         string     `json:"mood"`
	Location     string     `json:"location"`
	CoverURL     string     `json:"coverUrl"`
	Tags         []string   `json:"tags"`
	ImageURLs    []string   `json:"imageUrls"`
	RenderedHTML string     `json:"renderedHtml,omitempty"`
	PublishedAt  *time.Time `json:"publishedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type pagedArticles struct {
	Items    any   `json:"items"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
	Total    int64 `json:"total"`
}

func (h *Handler) publicArticles(c *gin.Context) {
	page, pageSize := pagination(c)
	query := h.db.Model(&model.Article{}).
		Where("status = ?", model.ArticleStatusPublished)

	if kind := strings.TrimSpace(c.Query("kind")); kind != "" {
		if !model.ValidArticleKind(kind) {
			fail(c, http.StatusBadRequest, "validation_error", "kind 参数无效")
			return
		}
		query = query.Where("kind = ?", kind)
	}
	if tag := strings.TrimSpace(c.Query("tag")); tag != "" {
		tagJSON, err := json.Marshal([]string{tag})
		if err != nil {
			fail(c, http.StatusBadRequest, "validation_error", "tag 参数无效")
			return
		}
		query = query.Where("tags @> ?::jsonb", string(tagJSON))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logDBError("count public articles", err)
		internalError(c)
		return
	}

	var articles []model.Article
	if err := query.
		Order("published_at DESC NULLS LAST, id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&articles).Error; err != nil {
		h.logDBError("list public articles", err)
		internalError(c)
		return
	}

	items := make([]publicArticle, 0, len(articles))
	includeContent := c.Query("includeContent") == "true"
	for _, article := range articles {
		items = append(items, toPublicArticle(article, includeContent))
	}
	respond(c, http.StatusOK, pagedArticles{
		Items: items, Page: page, PageSize: pageSize, Total: total,
	})
}

func (h *Handler) publicArticle(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	var article model.Article
	err := h.db.
		Where("slug = ? AND status = ?", slug, model.ArticleStatusPublished).
		First(&article).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		fail(c, http.StatusNotFound, "not_found", "内容不存在")
		return
	}
	if err != nil {
		h.logDBError("get public article", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, toPublicArticle(article, true))
}

func (h *Handler) adminArticles(c *gin.Context) {
	page, pageSize := pagination(c)
	query := h.db.Model(&model.Article{})
	if kind := strings.TrimSpace(c.Query("kind")); kind != "" {
		query = query.Where("kind = ?", kind)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword := strings.TrimSpace(c.Query("q")); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("title ILIKE ? OR slug ILIKE ?", like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logDBError("count admin articles", err)
		internalError(c)
		return
	}

	var articles []model.Article
	if err := query.Order("updated_at DESC, id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&articles).Error; err != nil {
		h.logDBError("list admin articles", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, pagedArticles{
		Items: articles, Page: page, PageSize: pageSize, Total: total,
	})
}

func (h *Handler) adminArticle(c *gin.Context) {
	article, ok := h.findArticle(c)
	if !ok {
		return
	}
	respond(c, http.StatusOK, article)
}

func (h *Handler) createArticle(c *gin.Context) {
	var input articleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	if message := validateArticleInput(input); message != "" {
		fail(c, http.StatusBadRequest, "validation_error", message)
		return
	}

	article := model.Article{
		Kind:         strings.TrimSpace(input.Kind),
		Status:       model.ArticleStatusDraft,
		Slug:         strings.TrimSpace(input.Slug),
		Title:        strings.TrimSpace(input.Title),
		Summary:      strings.TrimSpace(input.Summary),
		Mood:         strings.TrimSpace(input.Mood),
		Location:     strings.TrimSpace(input.Location),
		CoverURL:     strings.TrimSpace(input.CoverURL),
		Tags:         compactStrings(input.Tags),
		ImageURLs:    compactStrings(input.ImageURLs),
		ContentHTML:  input.ContentHTML,
		RenderedHTML: h.sanitizer.HTML(input.ContentHTML),
	}
	if err := h.db.Create(&article).Error; err != nil {
		if isUniqueViolation(err) {
			fail(c, http.StatusConflict, "slug_exists", "slug 已存在")
			return
		}
		h.logDBError("create article", err)
		internalError(c)
		return
	}
	respond(c, http.StatusCreated, article)
}

func (h *Handler) updateArticle(c *gin.Context) {
	article, ok := h.findArticle(c)
	if !ok {
		return
	}

	var input articleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	if message := validateArticleInput(input); message != "" {
		fail(c, http.StatusBadRequest, "validation_error", message)
		return
	}

	article.Kind = strings.TrimSpace(input.Kind)
	article.Slug = strings.TrimSpace(input.Slug)
	article.Title = strings.TrimSpace(input.Title)
	article.Summary = strings.TrimSpace(input.Summary)
	article.Mood = strings.TrimSpace(input.Mood)
	article.Location = strings.TrimSpace(input.Location)
	article.CoverURL = strings.TrimSpace(input.CoverURL)
	article.Tags = compactStrings(input.Tags)
	article.ImageURLs = compactStrings(input.ImageURLs)
	article.ContentHTML = input.ContentHTML
	article.RenderedHTML = h.sanitizer.HTML(input.ContentHTML)

	save := func(tx *gorm.DB) error {
		if err := tx.Save(&article).Error; err != nil {
			return err
		}
		if article.Status == model.ArticleStatusPublished {
			return createArticleRevision(tx, article)
		}
		return nil
	}
	if err := h.db.Transaction(save); err != nil {
		if isUniqueViolation(err) {
			fail(c, http.StatusConflict, "slug_exists", "slug 已存在")
			return
		}
		h.logDBError("update article", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, article)
}

func (h *Handler) publishArticle(c *gin.Context) {
	article, ok := h.findArticle(c)
	if !ok {
		return
	}
	now := time.Now().UTC()
	article.Status = model.ArticleStatusPublished
	article.PublishedAt = &now
	article.RenderedHTML = h.sanitizer.HTML(article.ContentHTML)

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&article).Error; err != nil {
			return err
		}
		return createArticleRevision(tx, article)
	})
	if err != nil {
		h.logDBError("publish article", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, article)
}

func createArticleRevision(tx *gorm.DB, article *model.Article) error {
	var revision uint
	if err := tx.Model(&model.ArticleRevision{}).
		Where("article_id = ?", article.ID).
		Select("COALESCE(MAX(revision), 0)").
		Scan(&revision).Error; err != nil {
		return err
	}
	history := model.ArticleRevision{
		ArticleID:    article.ID,
		Revision:     revision + 1,
		Title:        article.Title,
		Summary:      article.Summary,
		CoverURL:     article.CoverURL,
		Tags:         article.Tags,
		ImageURLs:    article.ImageURLs,
		ContentHTML:  article.ContentHTML,
		RenderedHTML: article.RenderedHTML,
	}
	return tx.Create(&history).Error
}

func (h *Handler) unpublishArticle(c *gin.Context) {
	article, ok := h.findArticle(c)
	if !ok {
		return
	}
	article.Status = model.ArticleStatusDraft
	article.PublishedAt = nil
	if err := h.db.Save(&article).Error; err != nil {
		h.logDBError("unpublish article", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, article)
}

func (h *Handler) deleteArticle(c *gin.Context) {
	article, ok := h.findArticle(c)
	if !ok {
		return
	}
	if err := h.db.Delete(&article).Error; err != nil {
		h.logDBError("delete article", err)
		internalError(c)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) articleRevisions(c *gin.Context) {
	article, ok := h.findArticle(c)
	if !ok {
		return
	}
	var revisions []model.ArticleRevision
	if err := h.db.Where("article_id = ?", article.ID).
		Order("revision DESC").
		Find(&revisions).Error; err != nil {
		h.logDBError("list article revisions", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, revisions)
}

func (h *Handler) findArticle(c *gin.Context) (*model.Article, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		fail(c, http.StatusBadRequest, "validation_error", "文章 ID 无效")
		return nil, false
	}
	var article model.Article
	err = h.db.First(&article, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		fail(c, http.StatusNotFound, "not_found", "内容不存在")
		return nil, false
	}
	if err != nil {
		h.logDBError("find article", err)
		internalError(c)
		return nil, false
	}
	return &article, true
}

func validateArticleInput(input articleInput) string {
	if !model.ValidArticleKind(strings.TrimSpace(input.Kind)) {
		return "内容类型无效"
	}
	if strings.TrimSpace(input.Title) == "" {
		return "标题不能为空"
	}
	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		return "slug 不能为空"
	}
	if !validSlug(slug) {
		return "slug 格式无效"
	}
	return ""
}

var slugPattern = regexp.MustCompile(`^[\p{L}\p{N}](?:[\p{L}\p{N}._~-]*[\p{L}\p{N}])?$`)

func validSlug(value string) bool {
	value = strings.TrimSpace(value)
	return len(value) <= 180 &&
		!strings.Contains(value, "..") &&
		slugPattern.MatchString(value)
}

func toPublicArticle(article model.Article, includeContent bool) publicArticle {
	result := publicArticle{
		ID:          article.ID,
		Kind:        article.Kind,
		Slug:        article.Slug,
		Title:       article.Title,
		Summary:     article.Summary,
		Mood:        article.Mood,
		Location:    article.Location,
		CoverURL:    article.CoverURL,
		Tags:        article.Tags,
		ImageURLs:   article.ImageURLs,
		PublishedAt: article.PublishedAt,
		CreatedAt:   article.CreatedAt,
		UpdatedAt:   article.UpdatedAt,
	}
	if includeContent {
		result.RenderedHTML = article.RenderedHTML
	}
	return result
}

func pagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

func compactStrings(values []string) []string {
	if values == nil {
		return []string{}
	}
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func isUniqueViolation(err error) bool {
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) {
		return pgError.Code == "23505"
	}
	return strings.Contains(strings.ToLower(err.Error()), "duplicate key") ||
		strings.Contains(strings.ToLower(err.Error()), "unique constraint")
}

func (h *Handler) logDBError(operation string, err error) {
	h.logger.Error(operation, "error", err)
}
