package handlers

import (
	"bytes"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"path/filepath"
	"strings"
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
	mimeType := imageMimeType(header.Header.Get("Content-Type"), header.Filename, data)
	if !strings.HasPrefix(mimeType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only image uploads are supported"})
		return
	}

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

	var filename string
	var mimeType string
	var data []byte
	err := database.DB.QueryRow(`SELECT filename, mime_type, data FROM uploads WHERE id = ?`, id).Scan(&filename, &mimeType, &data)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	mimeType = imageMimeType(mimeType, filename, data)
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Data(http.StatusOK, mimeType, data)
}

func ServeUploadThumbnail(c *gin.Context) {
	id := c.Param("id")

	var filename string
	var mimeType string
	var data []byte
	err := database.DB.QueryRow(`SELECT filename, mime_type, data FROM uploads WHERE id = ?`, id).Scan(&filename, &mimeType, &data)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	mimeType = imageMimeType(mimeType, filename, data)
	if isSVGImage(mimeType, filename, data) {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Data(http.StatusOK, mimeType, data)
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

func imageMimeType(contentType, filename string, data []byte) string {
	declared := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	detected := strings.ToLower(strings.TrimSpace(strings.Split(http.DetectContentType(data), ";")[0]))
	if isSVGImage(declared, filename, data) || isSVGImage(detected, filename, data) {
		return "image/svg+xml"
	}
	if strings.HasPrefix(detected, "image/") {
		return detected
	}
	return detected
}

func isSVGImage(mimeType, filename string, data []byte) bool {
	if mimeType == "image/svg+xml" {
		return hasSVGRoot(data)
	}
	if strings.EqualFold(filepath.Ext(filename), ".svg") {
		return hasSVGRoot(data)
	}
	if mimeType == "text/xml" || mimeType == "application/xml" || mimeType == "text/plain" || mimeType == "" {
		return hasSVGRoot(data)
	}
	return false
}

func hasSVGRoot(data []byte) bool {
	sniff := string(data)
	if len(sniff) > 4096 {
		sniff = sniff[:4096]
	}
	sniff = strings.TrimLeft(sniff, "\ufeff \t\r\n")
	for {
		lower := strings.ToLower(sniff)
		switch {
		case strings.HasPrefix(lower, "<?xml"):
			idx := strings.Index(sniff, "?>")
			if idx < 0 {
				return false
			}
			sniff = strings.TrimLeft(sniff[idx+2:], " \t\r\n")
		case strings.HasPrefix(lower, "<!--"):
			idx := strings.Index(sniff, "-->")
			if idx < 0 {
				return false
			}
			sniff = strings.TrimLeft(sniff[idx+3:], " \t\r\n")
		case strings.HasPrefix(lower, "<!doctype"):
			idx := strings.Index(sniff, ">")
			if idx < 0 {
				return false
			}
			sniff = strings.TrimLeft(sniff[idx+1:], " \t\r\n")
		default:
			return strings.HasPrefix(lower, "<svg")
		}
	}
}
