package handlers

import (
	"net/http"
	"w-panel/internal/database"

	"github.com/gin-gonic/gin"
)

type WallpaperItem struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	CreatedAt string `json:"created_at"`
}

func ListWallpapers(c *gin.Context) {
	rows, err := database.DB.Query(
		`SELECT w.id, w.upload_id, w.created_at FROM wallpapers w ORDER BY w.created_at DESC`,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := []WallpaperItem{}
	for rows.Next() {
		var id, uploadID, createdAt string
		if err := rows.Scan(&id, &uploadID, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		items = append(items, WallpaperItem{
			ID:        id,
			URL:       "/api/uploads/" + uploadID,
			CreatedAt: createdAt,
		})
	}

	c.JSON(http.StatusOK, items)
}

func AddWallpaper(c *gin.Context) {
	var req struct {
		UploadID string `json:"upload_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := req.UploadID
	_, err := database.DB.Exec(
		`INSERT OR IGNORE INTO wallpapers (id, upload_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
		id, req.UploadID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, WallpaperItem{
		ID:  id,
		URL: "/api/uploads/" + req.UploadID,
	})
}

func DeleteWallpaper(c *gin.Context) {
	id := c.Param("id")

	var uploadID string
	err := database.DB.QueryRow(`SELECT upload_id FROM wallpapers WHERE id = ?`, id).Scan(&uploadID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "wallpaper not found"})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if _, err := tx.Exec(`DELETE FROM wallpapers WHERE id = ?`, id); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if _, err := tx.Exec(`DELETE FROM uploads WHERE id = ?`, uploadID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	currentBg := ""
	database.DB.QueryRow(`SELECT value FROM settings WHERE key = 'background_image'`).Scan(&currentBg)
	if currentBg == "/api/uploads/"+uploadID {
		if _, err := tx.Exec(`UPDATE settings SET value = '' WHERE key = 'background_image'`); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted", "cleared_background": currentBg == "/api/uploads/"+uploadID})
}
