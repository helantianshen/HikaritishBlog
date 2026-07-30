package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"hikaritish.blog/server/internal/model"
	"hikaritish.blog/server/internal/storage"

	"github.com/gin-gonic/gin"
)

type presignAssetInput struct {
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type completeAssetInput struct {
	ObjectKey    string `json:"objectKey"`
	OriginalName string `json:"originalName"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
}

func (h *Handler) presignAsset(c *gin.Context) {
	var input presignAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	result, err := h.storage.PresignImage(
		c.Request.Context(),
		strings.TrimSpace(input.Filename),
		strings.TrimSpace(input.ContentType),
		input.SizeBytes,
	)
	if err != nil {
		h.handleStorageError(c, err)
		return
	}
	respond(c, http.StatusOK, result)
}

func (h *Handler) completeAsset(c *gin.Context) {
	var input completeAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	info, err := h.storage.InspectImage(c.Request.Context(), strings.TrimSpace(input.ObjectKey))
	if err != nil {
		h.handleStorageError(c, err)
		return
	}
	asset := model.Asset{
		ObjectKey:    info.ObjectKey,
		PublicURL:    info.PublicURL,
		MIMEType:     info.MIMEType,
		SizeBytes:    info.SizeBytes,
		Width:        input.Width,
		Height:       input.Height,
		OriginalName: strings.TrimSpace(input.OriginalName),
	}
	if err := h.db.Create(&asset).Error; err != nil {
		if isUniqueViolation(err) {
			var existing model.Asset
			if findErr := h.db.Where("object_key = ?", info.ObjectKey).First(&existing).Error; findErr == nil {
				respond(c, http.StatusOK, existing)
				return
			}
		}
		h.logDBError("complete asset", err)
		internalError(c)
		return
	}
	respond(c, http.StatusCreated, asset)
}

func (h *Handler) adminAssets(c *gin.Context) {
	page, pageSize := pagination(c)
	var total int64
	if err := h.db.Model(&model.Asset{}).Count(&total).Error; err != nil {
		h.logDBError("count assets", err)
		internalError(c)
		return
	}
	var items []model.Asset
	if err := h.db.Order("created_at DESC, id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&items).Error; err != nil {
		h.logDBError("list assets", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, pagedArticles{
		Items: items, Page: page, PageSize: pageSize, Total: total,
	})
}

func (h *Handler) deleteAsset(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var asset model.Asset
	if !h.findByID(c, id, &asset, "图片不存在") {
		return
	}
	if err := h.storage.Delete(c.Request.Context(), asset.ObjectKey); err != nil {
		h.handleStorageError(c, err)
		return
	}
	if err := h.db.Delete(&asset).Error; err != nil {
		h.logDBError("delete asset record", err)
		internalError(c)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) handleStorageError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, storage.ErrDisabled):
		fail(c, http.StatusServiceUnavailable, "storage_unavailable", "RustFS 尚未配置")
	case errors.Is(err, storage.ErrInvalidImage), errors.Is(err, storage.ErrInvalidObject):
		fail(c, http.StatusBadRequest, "invalid_image", "图片格式或对象标识无效")
	case errors.Is(err, storage.ErrImageTooLarge):
		fail(c, http.StatusRequestEntityTooLarge, "image_too_large", "图片超过大小限制")
	default:
		h.logger.Error("rustfs operation failed", "error", err)
		fail(c, http.StatusBadGateway, "storage_error", "图片存储服务暂时不可用")
	}
}
