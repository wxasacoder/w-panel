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
	// Determine data directory
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		exe, _ := os.Executable()
		dataDir = filepath.Join(filepath.Dir(exe), "data")
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
		// Groups
		api.GET("/groups", handlers.ListGroups)
		api.POST("/groups", handlers.CreateGroup)
		api.PUT("/groups/:id", handlers.UpdateGroup)
		api.DELETE("/groups/:id", handlers.DeleteGroup)
		api.PUT("/groups/reorder", handlers.ReorderGroups)

		// Cards
		api.POST("/cards", handlers.CreateCard)
		api.PUT("/cards/:id", handlers.UpdateCard)
		api.DELETE("/cards/:id", handlers.DeleteCard)
		api.PUT("/cards/reorder", handlers.ReorderCards)

		// Search
		api.GET("/search", handlers.SearchCards)

		// Settings
		api.GET("/settings", handlers.GetSettings)
		api.PUT("/settings", handlers.UpdateSettings)

		// Upload
		api.POST("/upload", handlers.UploadFile)
		api.GET("/uploads/:id", handlers.ServeUpload)

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
