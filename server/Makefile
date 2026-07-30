.PHONY: run test fmt vet build

run:
	go run ./cmd/blog-api

test:
	go test ./...

fmt:
	gofmt -w .

vet:
	go vet ./...

build:
	go build -o blog-api ./cmd/blog-api
