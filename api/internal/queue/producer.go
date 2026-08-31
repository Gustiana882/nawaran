package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type ProvisionWebsiteJob struct {
	WebsiteID string `json:"website_id"`
	Domain    string `json:"domain"`
	Image     string `json:"image"`
}

type Producer struct {
	conn *amqp.Connection
	ch   *amqp.Channel
}

func NewProducer(amqpURL string) (*Producer, error) {
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
		true,  // durable
		false, // auto delete
		false, // exclusive
		false, // no wait
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("declare queue: %w", err)
	}

	return &Producer{
		conn: conn,
		ch:   ch,
	}, nil
}

func (p *Producer) PublishProvision(ctx context.Context, job ProvisionWebsiteJob) error {
	body, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}

	return p.ch.PublishWithContext(
		ctx,
		"",
		os.Getenv("QUEUE_NAME"),
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
			Body:         body,
		},
	)
}

func (p *Producer) Close() error {
	if p.ch != nil {
		p.ch.Close()
	}

	if p.conn != nil {
		return p.conn.Close()
	}

	return nil
}
