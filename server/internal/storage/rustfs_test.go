package storage

import (
	"errors"
	"testing"
)

func TestValidateImage(t *testing.T) {
	tests := []struct {
		name        string
		filename    string
		contentType string
		wantType    string
		wantExt     string
		wantErr     error
	}{
		{
			name:        "jpeg",
			filename:    "photo.jpeg",
			contentType: "image/jpeg",
			wantType:    "image/jpeg",
			wantExt:     ".jpg",
		},
		{
			name:        "content type parameters",
			filename:    "photo.webp",
			contentType: "image/webp; charset=binary",
			wantType:    "image/webp",
			wantExt:     ".webp",
		},
		{
			name:        "unsupported svg",
			filename:    "vector.svg",
			contentType: "image/svg+xml",
			wantErr:     ErrInvalidImage,
		},
		{
			name:        "mismatched extension",
			filename:    "photo.png",
			contentType: "image/jpeg",
			wantErr:     ErrInvalidImage,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			gotType, gotExt, err := validateImage(test.filename, test.contentType)
			if test.wantErr != nil {
				if !errors.Is(err, test.wantErr) {
					t.Fatalf("validateImage() error = %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("validateImage() error = %v", err)
			}
			if gotType != test.wantType || gotExt != test.wantExt {
				t.Fatalf("validateImage() = %q, %q", gotType, gotExt)
			}
		})
	}
}

func TestValidObjectKey(t *testing.T) {
	valid := []string{
		"images/2026/07/0123456789abcdef.jpg",
		"images/a.webp",
	}
	for _, value := range valid {
		if !validObjectKey(value) {
			t.Fatalf("expected valid object key: %q", value)
		}
	}

	invalid := []string{
		"avatars/a.jpg",
		"images/../secret",
		"images\\a.jpg",
		"images/\x00.jpg",
	}
	for _, value := range invalid {
		if validObjectKey(value) {
			t.Fatalf("expected invalid object key: %q", value)
		}
	}
}
