package httpapi

import (
	"net/http"
	"time"

	"hikaritish.blog/server/internal/config"

	"github.com/gin-gonic/gin"
)

func NewRouter(cfg config.Config, handler *Handler) *gin.Engine {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), cors(cfg.AllowedOrigins))

	router.GET("/healthz", func(c *gin.Context) {
		respond(c, http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().UTC(),
		})
	})

	api := router.Group("/api/v1")
	public := api.Group("/public")
	{
		public.GET("/settings", handler.getSettings)
		public.GET("/articles", handler.publicArticles)
		public.GET("/articles/:slug", handler.publicArticle)
		public.GET("/friends", handler.publicFriends)
		public.GET("/projects", handler.publicProjects)
		public.GET("/albums", handler.publicAlbums)
	}

	admin := api.Group("/admin")
	admin.Use(requireAdminToken(cfg.AdminToken))
	{
		admin.GET("/articles", handler.adminArticles)
		admin.POST("/articles", handler.createArticle)
		admin.GET("/articles/:id", handler.adminArticle)
		admin.PUT("/articles/:id", handler.updateArticle)
		admin.DELETE("/articles/:id", handler.deleteArticle)
		admin.POST("/articles/:id/publish", handler.publishArticle)
		admin.POST("/articles/:id/unpublish", handler.unpublishArticle)
		admin.GET("/articles/:id/revisions", handler.articleRevisions)

		admin.GET("/settings", handler.getSettings)
		admin.PUT("/settings", handler.updateSettings)

		admin.GET("/friends", handler.adminFriends)
		admin.POST("/friends", handler.createFriend)
		admin.PUT("/friends/:id", handler.updateFriend)
		admin.DELETE("/friends/:id", handler.deleteFriend)

		admin.GET("/projects", handler.adminProjects)
		admin.POST("/projects", handler.createProject)
		admin.PUT("/projects/:id", handler.updateProject)
		admin.DELETE("/projects/:id", handler.deleteProject)

		admin.GET("/albums", handler.adminAlbums)
		admin.POST("/albums", handler.createAlbum)
		admin.PUT("/albums/:id", handler.updateAlbum)
		admin.DELETE("/albums/:id", handler.deleteAlbum)

		admin.GET("/assets", handler.adminAssets)
		admin.POST("/assets/presign", handler.presignAsset)
		admin.POST("/assets/complete", handler.completeAsset)
		admin.DELETE("/assets/:id", handler.deleteAsset)
	}

	return router
}
