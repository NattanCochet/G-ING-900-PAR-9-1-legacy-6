# 1. Containerization: Docker + Docker Compose

## Status

Accepted

## Context

The baseline project had no `Dockerfile` and no `docker-compose.yml` — running it
required a local Node install, and there was no reproducible way to build, run, or
persist data for the sqlite-backed app.

## Decision

Add [src/Dockerfile](../../src/Dockerfile) and [docker-compose.yml](../../docker-compose.yml):
a single `app` service, sqlite-backed, with a named volume (`todo-data:/data`) for
persistence.

## Consequences

- One command (`docker compose up`) builds, runs, and persists data.
- Easy to extend later (e.g. add a `mysql` service).
- Adds an extra tool to learn; the single-service topology doesn't demonstrate
  multi-container patterns.
- `Dockerfile` runs `RUN npm test` **during image build** — fails fast, but requires
  valid test env vars (e.g. `SQLITE_DB_LOCATION`) at build time.
- `docker-compose.yml` only declares the sqlite path (no `MYSQL_HOST`) —
  [src/database/mysql.js](../../src/database/mysql.js) is dead code unless a `mysql`
  service/env vars are added.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Dockerfile + docker-compose (chosen)** | One command to build+run+persist; easy to extend (e.g. mysql service) | Extra tool to learn; single-service topology hides multi-container patterns |
| Kubernetes / Helm | Production-grade orchestration | Overkill for a single-container ToDo app |
| No containerization | Fastest local iteration | No environment parity/isolation |
