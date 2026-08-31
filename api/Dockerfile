# ── Build stage ────────────────────────────────────────────────────────────────
FROM golang:1.25.5-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/api     ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/landing  ./cmd/landing
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/editor   ./cmd/editor
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/worker   ./cmd/worker


# ── API production image ───────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian13:nonroot AS api-prod

WORKDIR /app

COPY --from=build /app/api /app/api

# EXPOSE 80

ENTRYPOINT ["/app/api"]


# ── Landing production image ───────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian13:nonroot AS landing-prod

WORKDIR /app

COPY --from=build /app/landing /app/landing

# EXPOSE 80

ENTRYPOINT ["/app/landing"]


# ── Editor production image ────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian13:nonroot AS editor-prod

WORKDIR /app

COPY --from=build /app/editor /app/editor
COPY --from=build /app/static /app/static

# EXPOSE 80

ENTRYPOINT ["/app/editor"]

# ── Worker production image ────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian13:nonroot AS worker-prod

WORKDIR /app

COPY --from=build /app/worker /app/worker

# EXPOSE 80

ENTRYPOINT ["/app/worker"]