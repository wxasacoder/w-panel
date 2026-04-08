package themes

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ThemeInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Author      string `json:"author"`
	BuiltIn     bool   `json:"built_in"`
}

var builtInThemes = []ThemeInfo{
	{
		ID:          "liquid-glass",
		Name:        "Liquid Glass",
		Description: "Apple-inspired glassmorphism with extreme frosted glass effects, light refraction, and depth",
		Author:      "W-Panel",
		BuiltIn:     true,
	},
}

func ListThemes(c *gin.Context) {
	c.JSON(http.StatusOK, builtInThemes)
}

func InstallTheme(c *gin.Context) {
	// Placeholder for future theme installation
	c.JSON(http.StatusOK, gin.H{"message": "theme installation not yet implemented"})
}
