package handlers

import (
	"strings"
	"testing"
)

func TestImageMimeTypeDetectsSVGByFilename(t *testing.T) {
	data := []byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>`)

	got := imageMimeType("application/octet-stream", "icon.svg", data)

	if got != "image/svg+xml" {
		t.Fatalf("imageMimeType() = %q, want image/svg+xml", got)
	}
}

func TestImageMimeTypeDetectsSVGByContent(t *testing.T) {
	data := []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>`)

	got := imageMimeType("text/plain", "icon.txt", data)

	if got != "image/svg+xml" {
		t.Fatalf("imageMimeType() = %q, want image/svg+xml", got)
	}
}

func TestImageMimeTypeKeepsRasterImage(t *testing.T) {
	pngHeader := []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")

	got := imageMimeType("", "icon.png", pngHeader)

	if got != "image/png" {
		t.Fatalf("imageMimeType() = %q, want image/png", got)
	}
}

func TestImageMimeTypeRejectsPlainTextAsImage(t *testing.T) {
	got := imageMimeType("text/plain", "notes.txt", []byte("plain text"))

	if strings.HasPrefix(got, "image/") {
		t.Fatalf("imageMimeType() = %q, want non-image MIME", got)
	}
}

func TestImageMimeTypeRejectsFakeSVGHeader(t *testing.T) {
	got := imageMimeType("image/svg+xml", "icon.svg", []byte("plain text"))

	if strings.HasPrefix(got, "image/") {
		t.Fatalf("imageMimeType() = %q, want non-image MIME", got)
	}
}
