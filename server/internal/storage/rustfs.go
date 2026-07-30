package storage

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"mime"
	"path/filepath"
	"strings"
	"time"

	"hikaritish.blog/server/internal/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	ErrDisabled      = errors.New("rustfs is not configured")
	ErrInvalidImage  = errors.New("invalid image")
	ErrImageTooLarge = errors.New("image is too large")
	ErrInvalidObject = errors.New("invalid object key")
)

type RustFS struct {
	config    config.RustFSConfig
	client    *s3.Client
	presigner *s3.PresignClient
}

type PresignedUpload struct {
	ObjectKey string            `json:"objectKey"`
	UploadURL string            `json:"uploadUrl"`
	PublicURL string            `json:"publicUrl"`
	Headers   map[string]string `json:"headers"`
	ExpiresAt time.Time         `json:"expiresAt"`
}

type ObjectInfo struct {
	ObjectKey string
	PublicURL string
	MIMEType  string
	SizeBytes int64
}

func NewRustFS(ctx context.Context, cfg config.RustFSConfig) (*RustFS, error) {
	store := &RustFS{config: cfg}
	if !cfg.Enabled() {
		return store, nil
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(
		ctx,
		awsconfig.WithRegion(cfg.Region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load rustfs client config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(cfg.Endpoint)
		options.UsePathStyle = cfg.UsePathStyle
	})
	store.client = client
	store.presigner = s3.NewPresignClient(client)
	return store, nil
}

func (s *RustFS) Enabled() bool {
	return s != nil && s.client != nil && s.presigner != nil
}

func (s *RustFS) PresignImage(
	ctx context.Context,
	filename string,
	contentType string,
	sizeBytes int64,
) (PresignedUpload, error) {
	if !s.Enabled() {
		return PresignedUpload{}, ErrDisabled
	}
	normalizedType, extension, err := validateImage(filename, contentType)
	if err != nil {
		return PresignedUpload{}, err
	}
	if sizeBytes <= 0 {
		return PresignedUpload{}, fmt.Errorf("%w: size must be positive", ErrInvalidImage)
	}
	if sizeBytes > s.config.MaxImageBytes {
		return PresignedUpload{}, ErrImageTooLarge
	}

	randomPart, err := randomHex(16)
	if err != nil {
		return PresignedUpload{}, fmt.Errorf("create object key: %w", err)
	}
	now := time.Now().UTC()
	objectKey := fmt.Sprintf("images/%04d/%02d/%s%s", now.Year(), now.Month(), randomPart, extension)
	expiresAt := now.Add(10 * time.Minute)

	request, err := s.presigner.PresignPutObject(
		ctx,
		&s3.PutObjectInput{
			Bucket:      aws.String(s.config.Bucket),
			Key:         aws.String(objectKey),
			ContentType: aws.String(normalizedType),
		},
		func(options *s3.PresignOptions) {
			options.Expires = 10 * time.Minute
		},
	)
	if err != nil {
		return PresignedUpload{}, fmt.Errorf("presign rustfs upload: %w", err)
	}

	return PresignedUpload{
		ObjectKey: objectKey,
		UploadURL: request.URL,
		PublicURL: s.publicURL(objectKey),
		Headers: map[string]string{
			"Content-Type": normalizedType,
		},
		ExpiresAt: expiresAt,
	}, nil
}

func (s *RustFS) InspectImage(ctx context.Context, objectKey string) (ObjectInfo, error) {
	if !s.Enabled() {
		return ObjectInfo{}, ErrDisabled
	}
	if !validObjectKey(objectKey) {
		return ObjectInfo{}, ErrInvalidObject
	}

	output, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.config.Bucket),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		return ObjectInfo{}, fmt.Errorf("inspect rustfs object: %w", err)
	}

	contentType := strings.ToLower(strings.TrimSpace(aws.ToString(output.ContentType)))
	if !strings.HasPrefix(contentType, "image/") {
		return ObjectInfo{}, ErrInvalidImage
	}
	size := aws.ToInt64(output.ContentLength)
	if size <= 0 {
		return ObjectInfo{}, fmt.Errorf("%w: empty object", ErrInvalidImage)
	}
	if size > s.config.MaxImageBytes {
		return ObjectInfo{}, ErrImageTooLarge
	}

	return ObjectInfo{
		ObjectKey: objectKey,
		PublicURL: s.publicURL(objectKey),
		MIMEType:  contentType,
		SizeBytes: size,
	}, nil
}

func (s *RustFS) Delete(ctx context.Context, objectKey string) error {
	if !s.Enabled() {
		return ErrDisabled
	}
	if !validObjectKey(objectKey) {
		return ErrInvalidObject
	}
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.config.Bucket),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		return fmt.Errorf("delete rustfs object: %w", err)
	}
	return nil
}

func (s *RustFS) publicURL(objectKey string) string {
	return s.config.PublicBaseURL + "/" + objectKey
}

func validateImage(filename, contentType string) (string, string, error) {
	contentType = strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	allowed := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/gif":  ".gif",
		"image/webp": ".webp",
		"image/avif": ".avif",
	}
	extension, ok := allowed[contentType]
	if !ok {
		return "", "", fmt.Errorf("%w: unsupported content type", ErrInvalidImage)
	}

	filenameExtension := strings.ToLower(filepath.Ext(filename))
	if filenameExtension != "" {
		if detected := mime.TypeByExtension(filenameExtension); detected != "" {
			detected = strings.ToLower(strings.Split(detected, ";")[0])
			if detected != contentType &&
				!(contentType == "image/jpeg" && (filenameExtension == ".jpg" || filenameExtension == ".jpeg")) {
				return "", "", fmt.Errorf("%w: filename and content type do not match", ErrInvalidImage)
			}
		}
	}
	return contentType, extension, nil
}

func validObjectKey(value string) bool {
	return strings.HasPrefix(value, "images/") &&
		!strings.Contains(value, "..") &&
		!strings.ContainsAny(value, "\\\x00")
}

func randomHex(byteCount int) (string, error) {
	value := make([]byte, byteCount)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return hex.EncodeToString(value), nil
}
