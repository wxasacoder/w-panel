package models

import "time"

type Group struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Cards     []Card    `json:"cards,omitempty"`
}

type Card struct {
	ID          int64     `json:"id"`
	GroupID     int64     `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	IconType    string    `json:"icon_type"`     // "favicon", "upload", "letter"
	IconValue   string    `json:"icon_value"`    // favicon URL / upload file ID / first letter
	IconBgColor string    `json:"icon_bg_color"` // background color for letter-type icons
	OpenMode    string    `json:"open_mode"`     // "_self" or "_blank"
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Setting struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type Upload struct {
	ID        string    `json:"id"`
	Filename  string    `json:"filename"`
	MimeType  string    `json:"mime_type"`
	Data      []byte    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

// Request/Response types

type CreateGroupRequest struct {
	Name string `json:"name" binding:"required"`
}

type UpdateGroupRequest struct {
	Name string `json:"name" binding:"required"`
}

type ReorderRequest struct {
	IDs []int64 `json:"ids" binding:"required"`
}

type CardReorderRequest struct {
	GroupID int64   `json:"group_id" binding:"required"`
	IDs     []int64 `json:"ids" binding:"required"`
}

type CreateCardRequest struct {
	GroupID     int64  `json:"group_id" binding:"required"`
	Title       string `json:"title" binding:"required"`
	URL         string `json:"url" binding:"required"`
	IconType    string `json:"icon_type"`
	IconValue   string `json:"icon_value"`
	IconBgColor string `json:"icon_bg_color"`
	OpenMode    string `json:"open_mode"`
}

type UpdateCardRequest struct {
	GroupID     *int64  `json:"group_id"`
	Title       *string `json:"title"`
	URL         *string `json:"url"`
	IconType    *string `json:"icon_type"`
	IconValue   *string `json:"icon_value"`
	IconBgColor *string `json:"icon_bg_color"`
	OpenMode    *string `json:"open_mode"`
}

type SettingsUpdateRequest map[string]string

type UploadResponse struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}
