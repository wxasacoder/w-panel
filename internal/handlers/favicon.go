package handlers

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/html"
)

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
		c.JSON(http.StatusOK, gin.H{"icon_url": iconURL})
		return
	}

	// Fallback: try /favicon.ico
	baseURL := extractBaseURL(rawURL)
	faviconURL := baseURL + "/favicon.ico"
	resp, err := client.Head(faviconURL)
	if err == nil && resp.StatusCode == 200 {
		c.JSON(http.StatusOK, gin.H{"icon_url": faviconURL})
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

	baseURL := extractBaseURL(pageURL)
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
				if strings.HasPrefix(href, "//") {
					href = "https:" + href
				} else if strings.HasPrefix(href, "/") {
					href = baseURL + href
				} else if !strings.HasPrefix(href, "http") {
					href = baseURL + "/" + href
				}
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
