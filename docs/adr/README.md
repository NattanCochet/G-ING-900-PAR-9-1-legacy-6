# Architecture Decision Records

This directory records the architecture/technical decisions made while evolving this
project from Docker's baseline ["getting started" ToDo sample](../../../getting-started-app)
(Express + sqlite/mysql persistence, no tests, no containerization, no CI, no docs)
into its current form.

| ADR | Title |
|---|---|
| [0001](0001-containerization-docker.md) | Containerization: Docker + Docker Compose |
| [0002](0002-ci-github-actions.md) | Continuous Integration: GitHub Actions |
| [0003](0003-pre-commit-husky.md) | Pre-commit hook: Husky |
| [0004](0004-test-runner-jest.md) | Test runner: Jest |
| [0005](0005-spec-folder-layout.md) | Spec folder layout: `spec/routes` → `spec/tests` |
| [0006](0006-source-layout-database-front.md) | Source layout: `persistence/` → `database/`, static assets under `front/` |
| [0007](0007-domain-model-kanban.md) | Domain model: item-based ToDo → Kanban (projects/columns/tasks) |
| [0008](0008-authentication-jwt-bcrypt.md) | Authentication: JWT + bcrypt password hashing |
| [0009](0009-api-documentation-openapi-scalar.md) | API Documentation: OpenAPI (swagger-jsdoc) + Scalar reference UI |
| [0010](0010-linting-eslint.md) | Linting: ESLint |
| [0011](0011-domain-events-eventemitter.md) | Domain events: `EventEmitter`-based event bus |

Each ADR follows the same structure: **Status**, **Context**, **Decision**,
**Consequences**, and **Alternatives Considered**.
