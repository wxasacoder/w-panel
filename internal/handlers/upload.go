package handlers

import (
	"bytes"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"w-panel/internal/database"
	"w-panel/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/image/draw"
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

	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Data(http.StatusOK, mimeType, data)
}

func ServeUploadThumbnail(c *gin.Context) {
	id := c.Param("id")

	var mimeType string
	var data []byte
	err := database.DB.QueryRow(`SELECT mime_type, data FROM uploads WHERE id = ?`, id).Scan(&mimeType, &data)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Data(http.StatusOK, mimeType, data)
		return
	}

	bounds := img.Bounds()
	origW := bounds.Dx()
	origH := bounds.Dy()

	const thumbWidth = 200
	if origW <= thumbWidth {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Data(http.StatusOK, mimeType, data)
		return
	}

	thumbH := origH * thumbWidth / origW
	dst := image.NewRGBA(image.Rect(0, 0, thumbWidth, thumbH))
	draw.BiLinear.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 80}); err != nil {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Data(http.StatusOK, mimeType, data)
		return
	}

	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Data(http.StatusOK, "image/jpeg", buf.Bytes())
}
