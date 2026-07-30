package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"hikaritish.blog/server/internal/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (h *Handler) getSettings(c *gin.Context) {
	var settings model.SiteSettings
	err := h.db.First(&settings, 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		settings = model.DefaultSiteSettings()
		if err := h.db.Create(&settings).Error; err != nil {
			h.logDBError("create default settings", err)
			internalError(c)
			return
		}
	} else if err != nil {
		h.logDBError("get settings", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, settings)
}

func (h *Handler) updateSettings(c *gin.Context) {
	var input model.SiteSettings
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, "validation_error", "请求内容不是有效 JSON")
		return
	}
	input.SiteTitle = strings.TrimSpace(input.SiteTitle)
	if input.SiteTitle == "" {
		fail(c, http.StatusBadRequest, "validation_error", "站点标题不能为空")
		return
	}

	var existing model.SiteSettings
	if err := h.db.First(&existing, 1).Error; err != nil {
		h.logDBError("find settings before update", err)
		internalError(c)
		return
	}
	input.ID = 1
	input.CreatedAt = existing.CreatedAt
	input.UpdatedAt = existing.UpdatedAt
	input.NavItems = cleanNavItems(input.NavItems)
	input.SocialLinks = cleanSocialLinks(input.SocialLinks)
	input.ThemeColors = compactStrings(input.ThemeColors)
	input.BackgroundImages = compactStrings(input.BackgroundImages)
	input.MusicIDs = compactStrings(input.MusicIDs)
	input.DanmakuList = compactStrings(input.DanmakuList)
	input.PublicComment.Admins = compactStrings(input.PublicComment.Admins)
	input.Assistant.ModelID = strings.TrimSpace(input.Assistant.ModelID)
	input.Assistant.SystemPrompt = strings.TrimSpace(input.Assistant.SystemPrompt)
	if input.Assistant.MaxOutputTokens < 1 {
		input.Assistant.MaxOutputTokens = 150
	} else if input.Assistant.MaxOutputTokens > 8192 {
		input.Assistant.MaxOutputTokens = 8192
	}
	if input.Assistant.Temperature < 0 {
		input.Assistant.Temperature = 0
	} else if input.Assistant.Temperature > 2 {
		input.Assistant.Temperature = 2
	}

	if err := h.db.Save(&input).Error; err != nil {
		h.logDBError("update settings", err)
		internalError(c)
		return
	}
	respond(c, http.StatusOK, input)
}

func cleanNavItems(items []model.NavItem) []model.NavItem {
	result := make([]model.NavItem, 0, len(items))
	for _, item := range items {
		item.Label = strings.TrimSpace(item.Label)
		item.Href = strings.TrimSpace(item.Href)
		if item.Label != "" && item.Href != "" {
			result = append(result, item)
		}
	}
	return result
}

func cleanSocialLinks(items []model.SocialLink) []model.SocialLink {
	result := make([]model.SocialLink, 0, len(items))
	for _, item := range items {
		item.Label = strings.TrimSpace(item.Label)
		item.URL = strings.TrimSpace(item.URL)
		item.Icon = strings.TrimSpace(item.Icon)
		if item.Label != "" && item.URL != "" {
			result = append(result, item)
		}
	}
	return result
}
