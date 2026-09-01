package database

import (
	"context"
	"log"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func mustStartPostgresContainer() (func(context.Context, ...testcontainers.TerminateOption) error, error) {
	var (
		dbName = "database"
		dbPwd  = "password"
		dbUser = "user"
	)

	dbContainer, err := postgres.Run(
		context.Background(),
		"postgres:latest",
		postgres.WithDatabase(dbName),
		postgres.WithUsername(dbUser),
		postgres.WithPassword(dbPwd),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(5*time.Second)),
	)
	if err != nil {
		return nil, err
	}

	database = dbName
	password = dbPwd
	username = dbUser

	dbHost, err := dbContainer.Host(context.Background())
	if err != nil {
		return dbContainer.Terminate, err
	}

	dbPort, err := dbContainer.MappedPort(context.Background(), "5432/tcp")
	if err != nil {
		return dbContainer.Terminate, err
	}

	host = dbHost
	port = dbPort.Port()

	return dbContainer.Terminate, err
}

func TestMain(m *testing.M) {
	teardown, err := mustStartPostgresContainer()
	if err != nil {
		log.Fatalf("could not start postgres container: %v", err)
	}

	m.Run()

	if teardown != nil && teardown(context.Background()) != nil {
		log.Fatalf("could not teardown postgres container: %v", err)
	}
}

func TestNew(t *testing.T) {
	srv := New()
	if srv == nil {
		t.Fatal("New() returned nil")
	}
}

func TestHealth(t *testing.T) {
	srv := New()

	stats := srv.Health()

	if stats["status"] != "up" {
		t.Fatalf("expected status to be up, got %s", stats["status"])
	}

	if _, ok := stats["error"]; ok {
		t.Fatalf("expected error not to be present")
	}

	if stats["message"] != "It's healthy" {
		t.Fatalf("expected message to be 'It's healthy', got %s", stats["message"])
	}
}

func TestClose(t *testing.T) {
	srv := New()

	if srv.Close() != nil {
		t.Fatalf("expected Close() to return nil")
	}
}

func TestWebsiteLifecycleStatus(t *testing.T) {
	ctx := context.Background()
	srv := New()

	template, err := srv.CreateTemplate(ctx, CreateTemplateInput{
		Name:        "Template Test",
		Description: "desc",
		Data: map[string]any{
			"title": "Hello",
		},
		HTML: "<html><body>Hello</body></html>",
	})
	if err != nil {
		t.Fatalf("create template: %v", err)
	}

	website, err := srv.CreateWebsite(ctx, CreateWebsiteInput{
		Name:         "Website Lifecycle",
		Description:  "desc",
		Domain:       "lifecycle.example.com",
		TemplateUUID: template.ID,
		UserID:       "user-123",
	})
	if err != nil {
		t.Fatalf("create website: %v", err)
	}

	status, err := srv.GetWebsiteStatus(ctx, website.UUID)
	if err != nil {
		t.Fatalf("get website status: %v", err)
	}
	if status != "creating" {
		t.Fatalf("expected creating status, got %q", status)
	}

	if err := srv.SetWebsiteStatus(ctx, website.UUID, "active"); err != nil {
		t.Fatalf("set website status: %v", err)
	}

	status, err = srv.GetWebsiteStatus(ctx, website.UUID)
	if err != nil {
		t.Fatalf("get updated status: %v", err)
	}
	if status != "active" {
		t.Fatalf("expected active status, got %q", status)
	}
}
