package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"w-panel/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/net/html"
)

const maxFaviconSize = 2 << 20

func FetchFavicon(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url parameter required"})
		return
	}

	// Ensure URL has scheme
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}

	client := &http.Client{Timeout: 10 * time.Second}

	// Try to fetch the page and parse for icon links
	iconURL := findIconFromHTML(client, rawURL)
	if iconURL != "" {
		if localURL := fetchAndStoreFavicon(client, iconURL); localURL != "" {
			c.JSON(http.StatusOK, gin.H{"icon_url": localURL})
			return
		}
	}

	// Fallback: try /favicon.ico
	baseURL := extractBaseURL(rawURL)
	faviconURL := baseURL + "/favicon.ico"
	if localURL := fetchAndStoreFavicon(client, faviconURL); localURL != "" {
		c.JSON(http.StatusOK, gin.H{"icon_url": localURL})
		return
	}

	c.JSON(http.StatusOK, gin.H{"icon_url": ""})
}

func findIconFromHTML(client *http.Client, pageURL string) string {
	resp, err := client.Get(pageURL)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	// Limit read to 1MB
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return ""
	}

	doc, err := html.Parse(strings.NewReader(string(body)))
	if err != nil {
		return ""
	}

	var iconURL string
	var findIcon func(*html.Node)
	findIcon = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "link" {
			var rel, href string
			for _, attr := range n.Attr {
				switch attr.Key {
				case "rel":
					rel = strings.ToLower(attr.Val)
				case "href":
					href = attr.Val
				}
			}
			if href != "" && (strings.Contains(rel, "icon") || strings.Contains(rel, "shortcut")) {
				href = resolveURL(pageURL, href)
				// Prefer apple-touch-icon or larger icons
				if strings.Contains(rel, "apple-touch-icon") || iconURL == "" {
					iconURL = href
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findIcon(c)
		}
	}
	findIcon(doc)

	return iconURL
}

func fetchAndStoreFavicon(client *http.Client, iconURL string) string {
	resp, err := client.Get(iconURL)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return ""
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, maxFaviconSize+1))
	if err != nil || len(data) == 0 || len(data) > maxFaviconSize {
		return ""
	}

	mimeType := imageMimeType(resp.Header.Get("Content-Type"), iconURL, data)
	if !strings.HasPrefix(mimeType, "image/") {
		return ""
	}

	id := uuid.New().String()
	_, err = database.DB.Exec(
		`INSERT INTO uploads (id, filename, mime_type, data, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		id, "favicon", mimeType, data,
	)
	if err != nil {
		return ""
	}

	return "/api/uploads/" + id
}

func resolveURL(pageURL, href string) string {
	base, err := url.Parse(pageURL)
	if err != nil {
		return href
	}
	ref, err := url.Parse(href)
	if err != nil {
		return href
	}
	return base.ResolveReference(ref).String()
}

func extractBaseURL(rawURL string) string {
	// Extract scheme + host from URL
	idx := strings.Index(rawURL, "://")
	if idx == -1 {
		return rawURL
	}
	rest := rawURL[idx+3:]
	slashIdx := strings.Index(rest, "/")
	if slashIdx == -1 {
		return rawURL
	}
	return fmt.Sprintf("%s://%s", rawURL[:idx], rest[:slashIdx])
}
