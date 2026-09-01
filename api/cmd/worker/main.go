package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"api/internal/container"
	"api/internal/database"
	"api/internal/proxy"
	"api/internal/queue"
)

func main() {
	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	databaseService := database.New()
	podman := container.New(os.Getenv("PODMAN_API_URL"))
	caddy := proxy.New(os.Getenv("CADDY_API_URL"), os.Getenv("CADDY_SERVER_NAME"))

	consumer, err := queue.NewConsumer(
		rabbitmqURL,
		databaseService,
		podman,
		caddy,
	)
	if err != nil {
		log.Fatal(err)
	}
	defer consumer.Close()

	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	if err := consumer.Start(ctx); err != nil {
		log.Fatal(err)
	}
}
