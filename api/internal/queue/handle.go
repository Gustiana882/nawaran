package queue

import (
	"api/internal/container"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func (c *Consumer) handleMessage(parentCtx context.Context, msg amqp.Delivery) error {
	var job map[string]any
	if err := json.Unmarshal(msg.Body, &job); err != nil {
		log.Printf("invalid queue message: %v", err)
		return msg.Reject(false)
	}

	action, _ := job["action"].(string)
	if action == "delete" {
		deleteJob := DeleteWebsiteJob{}
		body, err := json.Marshal(job)
		if err != nil {
			return fmt.Errorf("marshal delete job: %w", err)
		}
		if err := json.Unmarshal(body, &deleteJob); err != nil {
			return fmt.Errorf("decode delete job: %w", err)
		}
		return c.handleDeleteMessage(parentCtx, deleteJob)
	}

	provisionJob := ProvisionWebsiteJob{}
	body, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal provision job: %w", err)
	}
	if err := json.Unmarshal(body, &provisionJob); err != nil {
		return fmt.Errorf("decode provision job: %w", err)
	}
	return c.handleProvisionMessage(parentCtx, provisionJob)
}

func (c *Consumer) handleProvisionMessage(parentCtx context.Context, job ProvisionWebsiteJob) error {
	log.Printf("provisioning website=%s domain=%s", job.WebsiteID, job.Domain)

	ctx, cancel := context.WithTimeout(parentCtx, 60*time.Second)
	defer cancel()

	containerName := strings.NewReplacer(".", "-", ":", "-", "/", "-", " ", "-").Replace(job.WebsiteID)
	if strings.TrimSpace(containerName) == "" {
		containerName = strings.NewReplacer(".", "-", ":", "-", "/", "-", " ", "-").Replace(job.Domain)
	}

	result, err := c.podman.Create(ctx, container.CreateRequest{
		Name:  containerName,
		Image: job.Image,
		Env: map[string]string{
			"LANDING_WEBSITE_ID": job.WebsiteID,
		},
	})
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "already in use") {
			if _, inspectErr := c.podman.Get(ctx, containerName); inspectErr == nil {
				log.Printf("container already exists, reusing name=%s", containerName)
			} else {
				return fmt.Errorf("create container: %w", err)
			}
		} else {
			return fmt.Errorf("create container: %w", err)
		}
	} else {
		log.Printf("container created id=%s", result.ID)
	}

	if err := c.podman.Start(ctx, containerName); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "already started") || strings.Contains(strings.ToLower(err.Error()), "is already running") {
			log.Printf("container already running name=%s", containerName)
		} else {
			return fmt.Errorf("start container: %w", err)
		}
	}

	log.Printf("container started name=%s", containerName)

	uuid, err := c.caddy.CreateProxy(ctx, job.Domain, containerName+":8080")
	if err != nil {
		return fmt.Errorf("create caddy proxy: %w", err)
	}

	if err := c.db.SetProxyID(ctx, job.WebsiteID, *uuid); err != nil {
		return fmt.Errorf("set proxy ID: %w", err)
	}
	if err := c.db.SetWebsiteStatus(ctx, job.WebsiteID, "active"); err != nil {
		return fmt.Errorf("set website status active: %w", err)
	}

	log.Printf("caddy proxy created domain=%s uuid=%s", job.Domain, uuid)
	return nil
}

func (c *Consumer) handleDeleteMessage(parentCtx context.Context, job DeleteWebsiteJob) error {
	log.Printf("deleting website=%s domain=%s", job.WebsiteID, job.Domain)

	ctx, cancel := context.WithTimeout(parentCtx, 60*time.Second)
	defer cancel()

	if job.ProxyID != nil && *job.ProxyID != "" {
		if err := c.caddy.DeleteProxy(ctx, *job.ProxyID); err != nil {
			log.Printf("delete caddy proxy failed for website=%s proxy=%s: %v", job.WebsiteID, *job.ProxyID, err)
		}
	}

	containerName := strings.NewReplacer(".", "-", ":", "-", "/", "-", " ", "-").Replace(job.WebsiteID)
	if strings.TrimSpace(containerName) == "" {
		containerName = strings.NewReplacer(".", "-", ":", "-", "/", "-", " ", "-").Replace(job.Domain)
	}

	if err := c.podman.Delete(ctx, containerName, true); err != nil {
		if !strings.Contains(strings.ToLower(err.Error()), "no such container") && !strings.Contains(strings.ToLower(err.Error()), "not found") {
			return fmt.Errorf("delete container: %w", err)
		}
	}

	if err := c.db.DeleteWebsite(ctx, job.WebsiteID); err != nil {
		return fmt.Errorf("delete website record: %w", err)
	}
	return nil
}
