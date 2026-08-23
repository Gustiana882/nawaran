# Simple Makefile for a Go project

# Build the application
all: build test

build:
	@echo "Building..."
	
	
	@go build -o main.exe cmd/api/main.go

build-landing:
	@echo "Building landing..."
	@go build -o landing.exe cmd/landing/main.go

# Run the application
run:
	@go run cmd/api/main.go

run-landing:
	@go run cmd/landing/main.go

podman-build-api:
	@podman build --target api-prod -t nawaran-api:latest .

podman-build-landing:
	@podman build --target landing-prod -t nawaran-landing:latest .

podman-build-all: podman-build-api podman-build-landing
# Create DB container
podman-run:
	@podman compose up --build

# Shutdown DB container
podman-down:
	@podman compose down

# Test the application
test:
	@echo "Testing..."
	@go test ./... -v
# Integrations Tests for the application
itest:
	@echo "Running integration tests..."
	@go test ./internal/database -v

# Clean the binary
clean:
	@echo "Cleaning..."
	@rm -f main

# Live Reload
watch:
	@powershell -ExecutionPolicy Bypass -Command "if (Get-Command air -ErrorAction SilentlyContinue) { \
		air; \
		Write-Output 'Watching...'; \
	} else { \
		Write-Output 'Installing air...'; \
		go install github.com/air-verse/air@latest; \
		air; \
		Write-Output 'Watching...'; \
	}"

watch-landing:
	@powershell -ExecutionPolicy Bypass -Command "$${env:STATIC_DIR='./static'}; go run cmd/landing/main.go"

.PHONY: all build build-landing run run-landing test clean watch watch-landing podman-run podman-down podman-build-api podman-build-landing podman-build-all itest
