# Makefile for nawaran API, landing, and editor

# ── Build ──────────────────────────────────────────────────────────────────────
all: build test

build:
	@echo "Building API..."
	@go build -o main.exe ./cmd/api

build-landing:
	@echo "Building landing..."
	@go build -o landing.exe ./cmd/landing

build-editor:
	@echo "Building editor..."
	@go build -o editor.exe ./cmd/editor

build-all: build build-landing build-editor

# ── Run (local dev) ────────────────────────────────────────────────────────────
run:
	@go run ./cmd/api

run-landing:
	@go run ./cmd/landing

run-editor:
	@go run ./cmd/editor

# ── Watch (live reload with air) ───────────────────────────────────────────────
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
	@powershell -ExecutionPolicy Bypass -Command "$${env:STATIC_DIR}='./static'; go run ./cmd/landing"

watch-editor:
	@powershell -ExecutionPolicy Bypass -Command "$${env:STATIC_DIR}='./static'; go run ./cmd/editor"

# ── Docker / Podman ────────────────────────────────────────────────────────────
podman-build-api:
	@podman build --target api-prod -t nawaran-api:latest .

podman-build-landing:
	@podman build --target landing-prod -t nawaran-landing:latest .

podman-build-editor:
	@podman build --target editor-prod -t nawaran-editor:latest .

podman-build-all: podman-build-api podman-build-landing podman-build-editor

podman-run:
	@podman compose up --build

podman-down:
	@podman compose down

# ── Test ───────────────────────────────────────────────────────────────────────
test:
	@echo "Testing..."
	@go test ./... -v

itest:
	@echo "Running integration tests..."
	@go test ./internal/database -v

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	@echo "Cleaning..."
	@rm -f main.exe landing.exe editor.exe

.PHONY: all \
	build build-landing build-editor build-all \
	run run-landing run-editor \
	watch watch-landing watch-editor \
	podman-build-api podman-build-landing podman-build-editor podman-build-all \
	podman-run podman-down \
	test itest clean
