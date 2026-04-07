package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"
	"w-panel/internal/database"
	"w-panel/internal/models"

	"github.com/gin-gonic/gin"
)

func ListGroups(c *gin.Context) {
	rows, err := database.DB.Query(`SELECT id, name, sort_order, created_at, updated_at FROM "groups" ORDER BY sort_order ASC, id ASC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var groups []models.Group
	for rows.Next() {
		var g models.Group
		if err := rows.Scan(&g.ID, &g.Name, &g.SortOrder, &g.CreatedAt, &g.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		g.Cards = []models.Card{}
		groups = append(groups, g)
	}

	if groups == nil {
		groups = []models.Group{}
	}

	// Fetch cards for all groups
	cardRows, err := database.DB.Query(`SELECT id, group_id, title, url, icon_type, COALESCE(icon_value,''), COALESCE(icon_bg_color,'#6366f1'), open_mode, sort_order, created_at, updated_at FROM cards ORDER BY sort_order ASC, id ASC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cardRows.Close()

	cardMap := make(map[int64][]models.Card)
	for cardRows.Next() {
		var card models.Card
		if err := cardRows.Scan(&card.ID, &card.GroupID, &card.Title, &card.URL, &card.IconType, &card.IconValue, &card.IconBgColor, &card.OpenMode, &card.SortOrder, &card.CreatedAt, &card.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		cardMap[card.GroupID] = append(cardMap[card.GroupID], card)
	}

	for i := range groups {
		if cards, ok := cardMap[groups[i].ID]; ok {
			groups[i].Cards = cards
		}
	}

	c.JSON(http.StatusOK, groups)
}

func CreateGroup(c *gin.Context) {
	var req models.CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get max sort_order
	var maxOrder int
	database.DB.QueryRow(`SELECT COALESCE(MAX(sort_order), -1) FROM "groups"`).Scan(&maxOrder)

	now := time.Now()
	result, err := database.DB.Exec(
		`INSERT INTO "groups" (name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?)`,
		req.Name, maxOrder+1, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, models.Group{
		ID:        id,
		Name:      req.Name,
		SortOrder: maxOrder + 1,
		CreatedAt: now,
		UpdatedAt: now,
		Cards:     []models.Card{},
	})
}

func UpdateGroup(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	res, err := database.DB.Exec(`UPDATE "groups" SET name = ?, updated_at = ? WHERE id = ?`, req.Name, now, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func DeleteGroup(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	res, err := database.DB.Exec(`DELETE FROM "groups" WHERE id = ?`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func ReorderGroups(c *gin.Context) {
	var req models.ReorderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	stmt, err := tx.Prepare(`UPDATE "groups" SET sort_order = ?, updated_at = ? WHERE id = ?`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer stmt.Close()

	now := time.Now()
	for i, id := range req.IDs {
		if _, err = stmt.Exec(i, now, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "reordered"})
}

// Helper for single group lookup
func getGroup(id int64) (*models.Group, error) {
	var g models.Group
	err := database.DB.QueryRow(`SELECT id, name, sort_order, created_at, updated_at FROM "groups" WHERE id = ?`, id).
		Scan(&g.ID, &g.Name, &g.SortOrder, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &g, err
}
