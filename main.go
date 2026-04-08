package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"w-panel/internal/database"
	"w-panel/internal/handlers"
	"w-panel/internal/themes"

	"github.com/gin-gonic/gin"
)

//go:embed frontend/dist/*
var frontendFS embed.FS

func main() {
	// Determine data directory (use cwd-relative path so go run . keeps data stable)
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = filepath.Join(".", "data")
	}

	// Initialize database
	if err := database.Init(dataDir); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Set up Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Set max upload size (10MB)
	r.MaxMultipartMemory = 10 << 20

	// API routes
	api := r.Group("/api")
	{
		// Groups（固定路径须写在 /:id 之前，避免 reorder 被当成 id）
		api.GET("/groups", handlers.ListGroups)
		api.POST("/groups", handlers.CreateGroup)
		api.PUT("/groups/reorder", handlers.ReorderGroups)
		api.PUT("/groups/:id", handlers.UpdateGroup)
		api.DELETE("/groups/:id", handlers.DeleteGroup)

		// Cards
		api.POST("/cards", handlers.CreateCard)
		api.PUT("/cards/reorder", handlers.ReorderCards)
		api.PUT("/cards/:id", handlers.UpdateCard)
		api.DELETE("/cards/:id", handlers.DeleteCard)

		// Search
		api.GET("/search", handlers.SearchCards)

		// Settings
		api.GET("/settings", handlers.GetSettings)
		api.PUT("/settings", handlers.UpdateSettings)

		// Upload
		api.POST("/upload", handlers.UploadFile)
		api.GET("/uploads/:id", handlers.ServeUpload)
		api.GET("/uploads/:id/thumbnail", handlers.ServeUploadThumbnail)

		// Wallpapers
		api.GET("/wallpapers", handlers.ListWallpapers)
		api.POST("/wallpapers", handlers.AddWallpaper)
		api.DELETE("/wallpapers/:id", handlers.DeleteWallpaper)

		// Favicon
		api.GET("/favicon", handlers.FetchFavicon)

		// Themes
		api.GET("/themes", themes.ListThemes)
		api.POST("/themes/install", themes.InstallTheme)
	}

	// Serve frontend static files
	distFS, err := fs.Sub(frontendFS, "frontend/dist")
	if err != nil {
		log.Fatalf("Failed to get frontend filesystem: %v", err)
	}

	// Serve static assets
	r.StaticFS("/assets", http.FS(distFS))

	// Serve index.html for SPA routing
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Serve static files from dist
		if path != "/" {
			filePath := path[1:] // remove leading /
			file, err := distFS.Open(filePath)
			if err == nil {
				file.Close()
				c.FileFromFS(path, http.FS(distFS))
				return
			}
		}

		// Fallback to index.html for SPA - always no-cache for HTML
		indexFile, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			c.String(http.StatusNotFound, "Not Found")
			return
		}
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexFile)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("W-Panel starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
