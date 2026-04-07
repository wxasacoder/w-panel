package handlers

import (
	"io"
	"net/http"
	"w-panel/internal/database"
	"w-panel/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func UploadFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	id := uuid.New().String()
	mimeType := http.DetectContentType(data)

	_, err = database.DB.Exec(
		`INSERT INTO uploads (id, filename, mime_type, data, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		id, header.Filename, mimeType, data,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.UploadResponse{
		ID:  id,
		URL: "/api/uploads/" + id,
	})
}

func ServeUpload(c *gin.Context) {
	id := c.Param("id")

	var mimeType string
	var data []byte
	err := database.DB.QueryRow(`SELECT mime_type, data FROM uploads WHERE id = ?`, id).Scan(&mimeType, &data)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	c.Data(http.StatusOK, mimeType, data)
}
