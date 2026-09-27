# Project api

One Paragraph of project description goes here

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

## MakeFile

Run build make command with tests
```bash
make all
```

Build the application
```bash
make build
```

Run the application
```bash
make run
```
Create DB container
```bash
make docker-run
```

Shutdown DB Container
```bash
make docker-down
```

DB Integrations Test:
```bash
make itest
```

Live reload the application:
```bash
make watch
```

Run the test suite:
```bash
make test
```

## Image uploads

The editor uploads images with authenticated `POST /api/upload` using multipart
field `file`. Public image reads use a separate unauthenticated endpoint:
`GET /api/images/{filename}`. Admin listing uses authenticated `GET /api/upload`,
and deleting uses authenticated `DELETE /api/upload/{filename}`. The upload
endpoint returns JSON containing the public `url`, which is directly compatible
with `static/editor-image.js`:

```json
{
	"name": "generated-file-name.jpg",
	"url": "/api/images/generated-file-name.jpg",
	"size": 12345,
	"content_type": "image/jpeg",
	"created_at": "2026-09-11T00:00:00Z"
}
```

Local storage is enabled by default. Configure it with `FILE_STORAGE_DRIVER=local`
and `FILE_STORAGE_PATH=./app/uploads` (or `/app/uploads` in Docker). Cloudinary
can be added later by implementing `storage.FileStorage` and registering its
driver in `newFileStorageFromEnv`.

Clean up binary from the last build:
```bash
make clean
```
