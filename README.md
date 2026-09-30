# Legacy Project

A Kanban-style project management application (projects, columns and tasks) built with Node.js, Express and EJS, backed by SQLite/MySQL, with JWT authentication and an OpenAPI-documented REST API.

## Links

- [**Notion:**](https://discord.gg/mJNFVVA2Y)
- [**Discord:**](https://app.notion.com/p/3ce9072f8f1c80dbbd04e21049598f91?v=3ce9072f8f1c802eaf19000c03eb876d&source=copy_link)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose (for containerized setup)

### Running with Docker

```bash
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file at the root with the required environment variables (database connection, JWT secret, etc.).

3. Start the app:

   ```bash
   npm start
   ```

   Or in watch mode during development:

   ```bash
   npm run dev
   ```

### Tests & Linting

```bash
npm test
npm run lint
```

## Documentation

See the [docs/adr](docs/adr) folder for architecture decision records covering the project's design choices (containerization, CI, authentication, domain model, etc.).


## Team organization: task reassignment for members on internships (3 days/week)

### Context

The project team consists of six members. Two team members took on internships three days a week in parallel with this project, leaving them only two working days a week.
This reduced their individual project availability by 60% and risked stalling progress whenever critical dependencies fell on their internship days.

### Decision

Reassign tasks and adjust the schedule according to the reduced weekly availability of both members:

- **Critical & operational paths**: Assign critical architecture tasks, urgent patches, and daily dependencies strictly to the four full-time project members.
- **Independent & modular scope**: Assign both members well-isolated, autonomous tasks (e.g., research, documentation, CI/CD, test suites, API integration) fitting a 2-day weekly capacity without blocking teammates during their 3 days of internship.
- **Handover protocol**: Require explicit status updates on active tickets before leaving for internships to ensure full-time members have complete context.
- **Rituals alignment**: Schedule planning and review syncs exclusively on days when the entire 6-person team is present.

### Consequences

- Full-time members can iterate continuously without waiting on part-time deliverables.
- Protects members on internships from context switching and pressure between the two commitments.
- Lower overall team throughput, requiring stricter backlog prioritization.
- Requires slicing tasks into smaller, 2-day-compatible deliverables for the two members.