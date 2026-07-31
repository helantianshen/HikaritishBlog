package storage

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync"
	"testing"

	"hikaritish.blog/server/internal/config"
)

func TestEnsureBucketCreatesAndConfiguresWithoutTouchingObjects(t *testing.T) {
	var (
		mutex      sync.Mutex
		operations []string
		corsBody   string
		policyBody string
	)
	record := func(operation string) {
		mutex.Lock()
		defer mutex.Unlock()
		operations = append(operations, operation)
	}

	testServer := httptest.NewServer(http.HandlerFunc(func(
		response http.ResponseWriter,
		request *http.Request,
	) {
		if request.URL.Path != "/blog-images" {
			http.Error(response, "unexpected path", http.StatusBadRequest)
			return
		}

		query := request.URL.Query()
		_, isCORS := query["cors"]
		_, isPolicy := query["policy"]
		switch {
		case request.Method == http.MethodHead:
			record("head bucket")
			response.WriteHeader(http.StatusNotFound)
		case request.Method == http.MethodPut && isCORS:
			record("put CORS")
			body, err := io.ReadAll(request.Body)
			if err != nil {
				http.Error(response, err.Error(), http.StatusBadRequest)
				return
			}
			mutex.Lock()
			corsBody = string(body)
			mutex.Unlock()
			response.WriteHeader(http.StatusOK)
		case request.Method == http.MethodPut && isPolicy:
			record("put policy")
			body, err := io.ReadAll(request.Body)
			if err != nil {
				http.Error(response, err.Error(), http.StatusBadRequest)
				return
			}
			mutex.Lock()
			policyBody = string(body)
			mutex.Unlock()
			response.WriteHeader(http.StatusOK)
		case request.Method == http.MethodPut:
			record("create bucket")
			response.WriteHeader(http.StatusOK)
		default:
			http.Error(response, "unexpected request", http.StatusBadRequest)
		}
	}))
	defer testServer.Close()

	store, err := NewRustFS(context.Background(), config.RustFSConfig{
		Endpoint:      testServer.URL,
		Region:        "us-east-1",
		AccessKey:     "test-access-key",
		SecretKey:     "test-secret-key",
		Bucket:        "blog-images",
		PublicBaseURL: testServer.URL + "/blog-images",
		UsePathStyle:  true,
		MaxImageBytes: 10 * 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("NewRustFS() error = %v", err)
	}
	if err := store.EnsureBucket(context.Background()); err != nil {
		t.Fatalf("EnsureBucket() error = %v", err)
	}

	mutex.Lock()
	defer mutex.Unlock()
	wantOperations := []string{
		"head bucket",
		"create bucket",
		"put CORS",
		"put policy",
	}
	if !reflect.DeepEqual(operations, wantOperations) {
		t.Fatalf("operations = %#v, want %#v", operations, wantOperations)
	}
	if !strings.Contains(corsBody, "<AllowedMethod>PUT</AllowedMethod>") ||
		!strings.Contains(corsBody, "<AllowedOrigin>*</AllowedOrigin>") {
		t.Fatalf("unexpected CORS document: %s", corsBody)
	}

	var policy map[string]any
	if err := json.Unmarshal([]byte(policyBody), &policy); err != nil {
		t.Fatalf("invalid bucket policy %q: %v", policyBody, err)
	}
	if !strings.Contains(policyBody, `"Action":["s3:GetObject"]`) ||
		!strings.Contains(policyBody, `"Resource":["arn:aws:s3:::blog-images/*"]`) {
		t.Fatalf("unexpected bucket policy: %#v", policy)
	}
}

func TestEnsureBucketRequiresConfiguredStorage(t *testing.T) {
	store, err := NewRustFS(context.Background(), config.RustFSConfig{})
	if err != nil {
		t.Fatalf("NewRustFS() error = %v", err)
	}
	if err := store.EnsureBucket(context.Background()); !errors.Is(err, ErrDisabled) {
		t.Fatalf("EnsureBucket() error = %v, want %v", err, ErrDisabled)
	}
}

func TestRustFSUsesPublicEndpointForUploadAndInternalEndpointForInspection(t *testing.T) {
	internalRequest := make(chan *http.Request, 1)
	internalServer := httptest.NewServer(http.HandlerFunc(func(
		response http.ResponseWriter,
		request *http.Request,
	) {
		internalRequest <- request.Clone(context.Background())
		response.Header().Set("Content-Type", "image/png")
		response.Header().Set("Content-Length", "128")
		response.WriteHeader(http.StatusOK)
	}))
	defer internalServer.Close()

	store, err := NewRustFS(context.Background(), config.RustFSConfig{
		Endpoint:         "https://oss.example",
		InternalEndpoint: internalServer.URL,
		Region:           "us-east-1",
		AccessKey:        "test-access-key",
		SecretKey:        "test-secret-key",
		Bucket:           "blog-images",
		PublicBaseURL:    "https://oss.example/blog-images",
		UsePathStyle:     true,
		MaxImageBytes:    10 * 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("NewRustFS() error = %v", err)
	}

	upload, err := store.PresignImage(context.Background(), "photo.png", "image/png", 128)
	if err != nil {
		t.Fatalf("PresignImage() error = %v", err)
	}
	if !strings.HasPrefix(upload.UploadURL, "https://oss.example/blog-images/") {
		t.Fatalf("upload URL = %q, want public endpoint", upload.UploadURL)
	}

	info, err := store.InspectImage(context.Background(), upload.ObjectKey)
	if err != nil {
		t.Fatalf("InspectImage() error = %v", err)
	}
	if info.SizeBytes != 128 || info.MIMEType != "image/png" {
		t.Fatalf("InspectImage() = %#v", info)
	}

	request := <-internalRequest
	if request.Method != http.MethodHead {
		t.Fatalf("internal request method = %q", request.Method)
	}
	if request.URL.Path != "/blog-images/"+upload.ObjectKey {
		t.Fatalf("internal request path = %q", request.URL.Path)
	}
}

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
