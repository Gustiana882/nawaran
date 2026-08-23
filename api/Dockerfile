FROM golang:1.25.5-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/landing ./cmd/landing


FROM gcr.io/distroless/static-debian13:nonroot AS api-prod

WORKDIR /app

COPY --from=build /app/api /app/api

EXPOSE 80

ENTRYPOINT ["/app/api"]


FROM gcr.io/distroless/static-debian13:nonroot AS landing-prod

WORKDIR /app

COPY --from=build /app/landing /app/landing
COPY --from=build /app/static /app/static

EXPOSE 80

ENTRYPOINT ["/app/landing"]