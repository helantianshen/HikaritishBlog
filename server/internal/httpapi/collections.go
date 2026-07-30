package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"hikaritish.blog/server/internal/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (h *Handler) publicFriends(c *gin.Context) {
	var items []model.Friend
	if err := h.db.Where("visible = ?", true).
		Order("sort_order ASC, id ASC").
		Find(&items).Error; err != nil {
		h.logDBError("list public friends", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, items)
}

func (h *Handler) adminFriends(c *gin.Context) {
	var items []model.Friend
	if err := h.db.Order("sort_order ASC, id ASC").Find(&items).Error; err != nil {
		h.logDBError("list admin friends", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, items)
}

func (h *Handler) createFriend(c *gin.Context) {
	var item model.Friend
	if err := c.ShouldBindJSON(&item); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	item.ID = 0
	item.Name = strings.TrimSpace(item.Name)
	item.URL = strings.TrimSpace(item.URL)
	if item.Name == "" || item.URL == "" {
		fail(c, http.StatusBadRequest, "validation_error", "名称和链接不能为空")
		return
	}
	if err := h.db.Create(&item).Error; err != nil {
		h.logDBError("create friend", err)
		internalError(c)
		return
	}
	respond(c, http.StatusCreated, item)
}

func (h *Handler) updateFriend(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var existing model.Friend
	if !h.findByID(c, id, &existing, "友链不存在") {
		return
	}
	var input model.Friend
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.URL = strings.TrimSpace(input.URL)
	if input.Name == "" || input.URL == "" {
		fail(c, http.StatusBadRequest, "validation_error", "名称和链接不能为空")
		return
	}
	input.ID = existing.ID
	input.CreatedAt = existing.CreatedAt
	input.DeletedAt = existing.DeletedAt
	if err := h.db.Save(&input).Error; err != nil {
		h.logDBError("update friend", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, input)
}

func (h *Handler) deleteFriend(c *gin.Context) {
	h.deleteByID(c, &model.Friend{}, "友链不存在")
}

func (h *Handler) publicProjects(c *gin.Context) {
	var items []model.Project
	if err := h.db.Where("visible = ?", true).
		Order("sort_order ASC, id ASC").
		Find(&items).Error; err != nil {
		h.logDBError("list public projects", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, items)
}

func (h *Handler) adminProjects(c *gin.Context) {
	var items []model.Project
	if err := h.db.Order("sort_order ASC, id ASC").Find(&items).Error; err != nil {
		h.logDBError("list admin projects", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, items)
}

func (h *Handler) createProject(c *gin.Context) {
	var item model.Project
	if err := c.ShouldBindJSON(&item); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	item.ID = 0
	item.Name = strings.TrimSpace(item.Name)
	item.Tags = compactStrings(item.Tags)
	if item.Name == "" {
		fail(c, http.StatusBadRequest, "validation_error", "项目名称不能为空")
		return
	}
	if err := h.db.Create(&item).Error; err != nil {
		h.logDBError("create project", err)
		internalError(c)
		return
	}
	respond(c, http.StatusCreated, item)
}

func (h *Handler) updateProject(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var existing model.Project
	if !h.findByID(c, id, &existing, "项目不存在") {
		return
	}
	var input model.Project
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Tags = compactStrings(input.Tags)
	if input.Name == "" {
		fail(c, http.StatusBadRequest, "validation_error", "项目名称不能为空")
		return
	}
	input.ID = existing.ID
	input.CreatedAt = existing.CreatedAt
	input.DeletedAt = existing.DeletedAt
	if err := h.db.Save(&input).Error; err != nil {
		h.logDBError("update project", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, input)
}

func (h *Handler) deleteProject(c *gin.Context) {
	h.deleteByID(c, &model.Project{}, "项目不存在")
}

func (h *Handler) publicAlbums(c *gin.Context) {
	var items []model.Album
	if err := h.db.Where("visible = ?", true).
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		Order("sort_order ASC, id ASC").
		Find(&items).Error; err != nil {
		h.logDBError("list public albums", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, items)
}

func (h *Handler) adminAlbums(c *gin.Context) {
	var items []model.Album
	if err := h.db.
		Preload("Photos", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		Order("sort_order ASC, id ASC").
		Find(&items).Error; err != nil {
		h.logDBError("list admin albums", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, items)
}

func (h *Handler) createAlbum(c *gin.Context) {
	var item model.Album
	if err := c.ShouldBindJSON(&item); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	item.ID = 0
	item.Slug = strings.TrimSpace(item.Slug)
	item.Name = strings.TrimSpace(item.Name)
	if item.Slug == "" || item.Name == "" {
		fail(c, http.StatusBadRequest, "validation_error", "相册名称和 slug 不能为空")
		return
	}
	if !validSlug(item.Slug) {
		fail(c, http.StatusBadRequest, "validation_error", "相册 slug 格式无效")
		return
	}
	for index := range item.Photos {
		item.Photos[index].ID = 0
		item.Photos[index].AlbumID = 0
	}
	if err := h.db.Create(&item).Error; err != nil {
		if isUniqueViolation(err) {
			fail(c, http.StatusConflict, "slug_exists", "相册 slug 已存在")
			return
		}
		h.logDBError("create album", err)
		internalError(c)
		return
	}
	respond(c, http.StatusCreated, item)
}

func (h *Handler) updateAlbum(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var existing model.Album
	if !h.findByID(c, id, &existing, "相册不存在") {
		return
	}
	var input model.Album
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	input.Slug = strings.TrimSpace(input.Slug)
	input.Name = strings.TrimSpace(input.Name)
	if input.Slug == "" || input.Name == "" {
		fail(c, http.StatusBadRequest, "validation_error", "相册名称和 slug 不能为空")
		return
	}
	if !validSlug(input.Slug) {
		fail(c, http.StatusBadRequest, "validation_error", "相册 slug 格式无效")
		return
	}
	input.ID = existing.ID
	input.CreatedAt = existing.CreatedAt
	input.DeletedAt = existing.DeletedAt

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("album_id = ?", input.ID).Delete(&model.Photo{}).Error; err != nil {
			return err
		}
		photos := input.Photos
		input.Photos = nil
		if err := tx.Save(&input).Error; err != nil {
			return err
		}
		for index := range photos {
			photos[index].ID = 0
			photos[index].AlbumID = input.ID
		}
		if len(photos) > 0 {
			if err := tx.Create(&photos).Error; err != nil {
				return err
			}
		}
		input.Photos = photos
		return nil
	})
	if err != nil {
		if isUniqueViolation(err) {
			fail(c, http.StatusConflict, "slug_exists", "相册 slug 已存在")
			return
		}
		h.logDBError("update album", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, input)
}

func (h *Handler) deleteAlbum(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var item model.Album
	if !h.findByID(c, id, &item, "相册不存在") {
		return
	}
	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("album_id = ?", id).Delete(&model.Photo{}).Error; err != nil {
			return err
		}
		return tx.Delete(&item).Error
	}); err != nil {
		h.logDBError("delete album", err)
		internalError(c)
		return
	}
	c.Status(http.StatusNoContent)
}

func parseID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		fail(c, http.StatusBadRequest, "validation_error", "ID 无效")
		return 0, false
	}
	return id, true
}

func (h *Handler) findByID(c *gin.Context, id uint64, target any, notFoundMessage string) bool {
	err := h.db.First(target, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		fail(c, http.StatusNotFound, "not_found", notFoundMessage)
		return false
	}
	if err != nil {
		h.logDBError("find collection item", err)
		internalError(c)
		return false
	}
	return true
}

func (h *Handler) deleteByID(c *gin.Context, target any, notFoundMessage string) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if !h.findByID(c, id, target, notFoundMessage) {
		return
	}
	if err := h.db.Delete(target).Error; err != nil {
		h.logDBError("delete collection item", err)
		internalError(c)
		return
	}
	c.Status(http.StatusNoContent)
}
