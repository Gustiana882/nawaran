package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"api/internal/container"
	"api/internal/proxy"
)

type Consumer struct {
	conn   *amqp.Connection
	ch     *amqp.Channel
	podman *container.Service
	caddy  *proxy.Service
}

func NewConsumer(amqpURL string, podman *container.Service, caddy *proxy.Service) (*Consumer, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("open rabbitmq channel: %w", err)
	}

	_, err = ch.QueueDeclare(
		os.Getenv("QUEUE_NAME"),
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("declare queue: %w", err)
	}

	// Jangan auto-ACK.
	if err := ch.Qos(
		1, // satu job per consumer
		0,
		false,
	); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("set qos: %w", err)
	}

	return &Consumer{
		conn:   conn,
		ch:     ch,
		podman: podman,
		caddy:  caddy,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) error {
	msgs, err := c.ch.Consume(
		os.Getenv("QUEUE_NAME"),
		"",
		false, // autoAck
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("consume queue: %w", err)
	}

	log.Println("website provision worker started")

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()

		case msg, ok := <-msgs:
			if !ok {
				return fmt.Errorf("rabbitmq channel closed")
			}

			if err := c.handleMessage(ctx, msg); err != nil {
				log.Printf("provision website failed: %v", err)

				// Message dikembalikan ke queue.
				if err := msg.Nack(false, true); err != nil {
					log.Printf("nack failed: %v", err)
				}

				continue
			}

			if err := msg.Ack(false); err != nil {
				log.Printf("ack failed: %v", err)
			}
		}
	}
}

func (c *Consumer) handleMessage(parentCtx context.Context, msg amqp.Delivery) error {
	var job ProvisionWebsiteJob

	if err := json.Unmarshal(msg.Body, &job); err != nil {
		// Message invalid. Jangan retry selamanya.
		log.Printf("invalid provision message: %v", err)
		return msg.Reject(false)
	}

	log.Printf("provisioning website=%s domain=%s", job.WebsiteID, job.Domain)

	// Satu job maksimal 60 detik.
	ctx, cancel := context.WithTimeout(parentCtx, 60*time.Second)
	defer cancel()

	containerName := strings.ReplaceAll(job.Domain, ".", "-")

	// =========================
	// 1. CREATE CONTAINER
	// =========================

	result, err := c.podman.Create(ctx, container.CreateRequest{
		Name:  containerName,
		Image: job.Image,
	})
	if err != nil {
		return fmt.Errorf("create container: %w", err)
	}

	log.Printf("container created id=%s", result.ID)

	// =========================
	// 2. START CONTAINER
	// =========================

	if err := c.podman.Start(ctx, containerName); err != nil {
		return fmt.Errorf("start container: %w", err)
	}

	log.Printf("container started name=%s", containerName)

	// =========================
	// 3. CREATE CADDY PROXY
	// =========================

	uuid, err := c.caddy.CreateProxy(ctx, job.Domain, containerName+":8080")
	if err != nil {
		return fmt.Errorf("create caddy proxy: %w", err)
	}

	log.Printf("caddy proxy created domain=%s uuid=%s", job.Domain, uuid)

	return nil
}

func (c *Consumer) Close() error {
	if c.ch != nil {
		c.ch.Close()
	}

	if c.conn != nil {
		return c.conn.Close()
	}

	return nil
}
