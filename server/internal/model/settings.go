package model

import "time"

type NavItem struct {
	Label string `json:"label"`
	Href  string `json:"href"`
}

type SocialLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
	Icon  string `json:"icon"`
}

type FooterBadge struct {
	Label string `json:"label"`
	URL   string `json:"url"`
	Image string `json:"image"`
}

type PublicCommentConfig struct {
	Enabled  bool     `json:"enabled"`
	Owner    string   `json:"owner"`
	Repo     string   `json:"repo"`
	ClientID string   `json:"clientId"`
	Admins   []string `json:"admins"`
}

type AssistantConfig struct {
	Enabled         bool    `json:"enabled"`
	ModelID         string  `json:"modelId"`
	SystemPrompt    string  `json:"systemPrompt"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
	Temperature     float64 `json:"temperature"`
}

type SiteSettings struct {
	ID                  uint64              `json:"id" gorm:"primaryKey"`
	SiteTitle           string              `json:"siteTitle" gorm:"size:240;not null"`
	FaviconURL          string              `json:"faviconUrl" gorm:"type:text"`
	AuthorName          string              `json:"authorName" gorm:"size:160"`
	Bio                 string              `json:"bio" gorm:"type:text"`
	AvatarURL           string              `json:"avatarUrl" gorm:"type:text"`
	NavTitle            string              `json:"navTitle" gorm:"size:120"`
	NavSuffix           string              `json:"navSuffix" gorm:"size:120"`
	NavAfter            string              `json:"navAfter" gorm:"size:120"`
	NavItems            []NavItem           `json:"navItems" gorm:"serializer:json;type:jsonb"`
	SocialLinks         []SocialLink        `json:"socialLinks" gorm:"serializer:json;type:jsonb"`
	UseGradient         bool                `json:"useGradient"`
	ThemeColors         []string            `json:"themeColors" gorm:"serializer:json;type:jsonb"`
	BackgroundImages    []string            `json:"backgroundImages" gorm:"serializer:json;type:jsonb"`
	DefaultPostCoverURL string              `json:"defaultPostCoverUrl" gorm:"type:text"`
	PhotoWallCoverURL   string              `json:"photoWallCoverUrl" gorm:"type:text"`
	MusicIDs            []string            `json:"musicIds" gorm:"serializer:json;type:jsonb"`
	DanmakuList         []string            `json:"danmakuList" gorm:"serializer:json;type:jsonb"`
	FooterBadges        []FooterBadge       `json:"footerBadges" gorm:"serializer:json;type:jsonb"`
	ICPNumber           string              `json:"icpNumber" gorm:"size:160"`
	ICPLink             string              `json:"icpLink" gorm:"type:text"`
	ChatterTitle        string              `json:"chatterTitle" gorm:"size:240"`
	ChatterDescription  string              `json:"chatterDescription" gorm:"type:text"`
	FriendApplyFormat   string              `json:"friendApplyFormat" gorm:"type:text"`
	PublicComment       PublicCommentConfig `json:"publicComment" gorm:"serializer:json;type:jsonb"`
	Assistant           AssistantConfig     `json:"assistant" gorm:"serializer:json;type:jsonb"`
	EnableLevelSystem   bool                `json:"enableLevelSystem"`
	EnableMusicPlayer   bool                `json:"enableMusicPlayer"`
	EnableDanmaku       bool                `json:"enableDanmaku"`
	BuildDate           *time.Time          `json:"buildDate"`
	CreatedAt           time.Time           `json:"createdAt"`
	UpdatedAt           time.Time           `json:"updatedAt"`
}

func DefaultSiteSettings() SiteSettings {
	return SiteSettings{
		ID:               1,
		SiteTitle:        "My Blog",
		AuthorName:       "Author",
		NavTitle:         "BLOG",
		NavItems:         []NavItem{},
		SocialLinks:      []SocialLink{},
		ThemeColors:      []string{},
		BackgroundImages: []string{},
		MusicIDs:         []string{},
		DanmakuList:      []string{},
		FooterBadges:     []FooterBadge{},
		PublicComment:    PublicCommentConfig{Admins: []string{}},
		Assistant: AssistantConfig{
			ModelID:         "gemini-2.5-flash-lite",
			MaxOutputTokens: 150,
			Temperature:     0.85,
		},
		EnableMusicPlayer: true,
	}
}
