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