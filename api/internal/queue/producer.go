package queue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type ProvisionWebsiteJob struct {
	Action    string `json:"action"`
	WebsiteID string `json:"website_id"`
	Domain    string `json:"domain"`
	Image     string `json:"image"`
}

type DeleteWebsiteJob struct {
	Action    string  `json:"action"`
	WebsiteID string  `json:"website_id"`
	Domain    string  `json:"domain"`
	ProxyID   *string `json:"proxy_id,omitempty"`
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

	queueName := os.Getenv("QUEUE_NAME")
	if queueName == "" {
		queueName = "provision-website"
	}

	dlxExchange := queueName + "-dlx"
	dlqQueue := queueName + "-dlq"

	if err := ch.ExchangeDeclare(dlxExchange, amqp.ExchangeDirect, true, false, false, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("declare dlx exchange: %w", err)
	}

	if _, err := ch.QueueDeclare(dlqQueue, true, false, false, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("declare dlq: %w", err)
	}

	if err := ch.QueueBind(dlqQueue, queueName, dlxExchange, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("bind dlq: %w", err)
	}

	_, err = ch.QueueDeclare(
		queueName,
		true,  // durable
		false, // auto delete
		false, // exclusive
		false, // no wait
		amqp.Table{
			"x-dead-letter-exchange":    dlxExchange,
			"x-dead-letter-routing-key": queueName,
		},
	)
	if err != nil {
		var amqpErr *amqp.Error
		if errors.As(err, &amqpErr) && amqpErr.Code == 406 {
			log.Printf("queue %s already exists with incompatible arguments; keeping current definition to avoid RabbitMQ 406 redeclare mismatch", queueName)
			return &Producer{conn: conn, ch: ch}, nil
		}
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("declare queue: %w", err)
	}

	return &Producer{conn: conn, ch: ch}, nil
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

func (p *Producer) PublishDelete(ctx context.Context, job DeleteWebsiteJob) error {
	body, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal delete job: %w", err)
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
