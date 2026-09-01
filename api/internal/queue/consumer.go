package queue

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	amqp "github.com/rabbitmq/amqp091-go"

	"api/internal/container"
	"api/internal/database"
	"api/internal/proxy"
)

type Consumer struct {
	conn   *amqp.Connection
	ch     *amqp.Channel
	db     database.Service
	podman *container.Service
	caddy  *proxy.Service
}

func NewConsumer(amqpURL string, db database.Service, podman *container.Service, caddy *proxy.Service) (*Consumer, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("open rabbitmq channel: %w", err)
	}

	queueName := os.Getenv("QUEUE_NAME")
	if queueName == "" {
		queueName = "provision-website"
	}
	deadLetterExchange := queueName + "-dlx"
	deadLetterQueue := queueName + "-dlq"

	if err := ch.ExchangeDeclare(deadLetterExchange, amqp.ExchangeDirect, true, false, false, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("declare dlx exchange: %w", err)
	}

	if _, err := ch.QueueDeclare(deadLetterQueue, true, false, false, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("declare dlq: %w", err)
	}

	if err := ch.QueueBind(deadLetterQueue, queueName, deadLetterExchange, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("bind dlq: %w", err)
	}

	_, err = ch.QueueDeclare(
		queueName,
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-dead-letter-exchange":    deadLetterExchange,
			"x-dead-letter-routing-key": queueName,
		},
	)
	if err != nil {
		var amqpErr *amqp.Error
		if errors.As(err, &amqpErr) && amqpErr.Code == 406 {
			log.Printf("queue %s already exists with incompatible arguments; keeping current definition to avoid RabbitMQ 406 redeclare mismatch", queueName)
		} else {
			ch.Close()
			conn.Close()
			return nil, fmt.Errorf("declare queue: %w", err)
		}
	}

	if err := ch.Qos(1, 0, false); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("set qos: %w", err)
	}

	return &Consumer{
		conn:   conn,
		ch:     ch,
		db:     db,
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

				if shouldDropMessage(err) {
					log.Printf("permanent failure: dropping message without requeue")
					if err := msg.Nack(false, false); err != nil {
						log.Printf("nack failed: %v", err)
					}
					continue
				}

				if errors.Is(err, database.ErrWebsiteNotFound) {
					log.Printf("website no longer exists, skipping stale queued job")
					if err := msg.Ack(false); err != nil {
						log.Printf("ack failed: %v", err)
					}
					continue
				}

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

func shouldDropMessage(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, database.ErrWebsiteNotFound) || errors.Is(err, database.ErrWebsiteDomainMismatch) {
		return true
	}
	if strings.Contains(err.Error(), "invalid provision message") || strings.Contains(err.Error(), "decode provision job") || strings.Contains(err.Error(), "marshal provision job") {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return false
	}
	return false
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
