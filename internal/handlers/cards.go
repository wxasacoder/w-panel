package handlers

import (
	"net/http"
	"strconv"
	"time"
	"w-panel/internal/database"
	"w-panel/internal/models"

	"github.com/gin-gonic/gin"
)

func CreateCard(c *gin.Context) {
	var req models.CreateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.IconType == "" {
		req.IconType = "letter"
	}
	if req.OpenMode == "" {
		req.OpenMode = "_blank"
	}
	if req.IconBgColor == "" {
		req.IconBgColor = "#6366f1"
	}

	// Get max sort_order within the group
	var maxOrder int
	database.DB.QueryRow(`SELECT COALESCE(MAX(sort_order), -1) FROM cards WHERE group_id = ?`, req.GroupID).Scan(&maxOrder)

	now := time.Now()
	result, err := database.DB.Exec(
		`INSERT INTO cards (group_id, title, url, icon_type, icon_value, icon_bg_color, open_mode, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		req.GroupID, req.Title, req.URL, req.IconType, req.IconValue, req.IconBgColor, req.OpenMode, maxOrder+1, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, models.Card{
		ID:          id,
		GroupID:     req.GroupID,
		Title:       req.Title,
		URL:         req.URL,
		IconType:    req.IconType,
		IconValue:   req.IconValue,
		IconBgColor: req.IconBgColor,
		OpenMode:    req.OpenMode,
		SortOrder:   maxOrder + 1,
		CreatedAt:   now,
		UpdatedAt:   now,
	})
}

func UpdateCard(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build dynamic update
	sets := []string{}
	args := []interface{}{}

	if req.GroupID != nil {
		sets = append(sets, "group_id = ?")
		args = append(args, *req.GroupID)
	}
	if req.Title != nil {
		sets = append(sets, "title = ?")
		args = append(args, *req.Title)
	}
	if req.URL != nil {
		sets = append(sets, "url = ?")
		args = append(args, *req.URL)
	}
	if req.IconType != nil {
		sets = append(sets, "icon_type = ?")
		args = append(args, *req.IconType)
	}
	if req.IconValue != nil {
		sets = append(sets, "icon_value = ?")
		args = append(args, *req.IconValue)
	}
	if req.IconBgColor != nil {
		sets = append(sets, "icon_bg_color = ?")
		args = append(args, *req.IconBgColor)
	}
	if req.OpenMode != nil {
		sets = append(sets, "open_mode = ?")
		args = append(args, *req.OpenMode)
	}

	if len(sets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	now := time.Now()
	sets = append(sets, "updated_at = ?")
	args = append(args, now)
	args = append(args, id)

	query := "UPDATE cards SET "
	for i, s := range sets {
		if i > 0 {
			query += ", "
		}
		query += s
	}
	query += " WHERE id = ?"

	res, err := database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func DeleteCard(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	res, err := database.DB.Exec(`DELETE FROM cards WHERE id = ?`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func ReorderCards(c *gin.Context) {
	var req models.CardReorderRequest
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

	stmt, err := tx.Prepare(`UPDATE cards SET group_id = ?, sort_order = ?, updated_at = ? WHERE id = ?`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer stmt.Close()

	now := time.Now()
	for i, id := range req.IDs {
		if _, err = stmt.Exec(req.GroupID, i, now, id); err != nil {
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

func SearchCards(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusOK, []models.Card{})
		return
	}

	like := "%" + q + "%"
	rows, err := database.DB.Query(
		`SELECT id, group_id, title, url, icon_type, COALESCE(icon_value,''), COALESCE(icon_bg_color,'#6366f1'), open_mode, sort_order, created_at, updated_at FROM cards WHERE title LIKE ? OR url LIKE ? ORDER BY title ASC LIMIT 20`,
		like, like,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var cards []models.Card
	for rows.Next() {
		var card models.Card
		if err := rows.Scan(&card.ID, &card.GroupID, &card.Title, &card.URL, &card.IconType, &card.IconValue, &card.IconBgColor, &card.OpenMode, &card.SortOrder, &card.CreatedAt, &card.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		cards = append(cards, card)
	}

	if cards == nil {
		cards = []models.Card{}
	}

	c.JSON(http.StatusOK, cards)
}
