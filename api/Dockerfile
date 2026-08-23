FROM golang:1.25.5-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o api cmd/api/main.go
RUN go build -o landing cmd/landing/main.go

FROM alpine:3.20.1 AS api-prod
WORKDIR /app
COPY --from=build /app/api /app/api
EXPOSE 80
CMD ["./api"]

FROM alpine:3.20.1 AS landing-prod
WORKDIR /app
COPY --from=build /app/landing /app/landing
COPY --from=build /app/static /app/static
EXPOSE 80
CMD ["./landing"]


