# Project Legacy Technical Choices Audit

- **Baseline:** [`../getting-started-app`](../getting-started-app) — Docker's official "getting started" ToDo sample (Express + sqlite/mysql persistence, no tests wired up, no containerization, no CI, no docs).
- **Scope:** current `dev` branch (`Original Project` → `First changes to the architecture` → `Dockerfile/compose/CI` → `rename routes file to test` → `husky pre-commit hook` → `delete sudo in ci.yml` → `handle missing husky in ci environment`).

---

## 1. Containerization: Docker + Docker Compose

- **Baseline:** no `Dockerfile`, no `docker-compose.yml`.
- **Decision:** added [src/Dockerfile](src/Dockerfile) and [docker-compose.yml](docker-compose.yml) — single `app` service, sqlite-backed, named volume (`todo-data:/data`) for persistence.

| Option | Pros | Cons |
|---|---|---|
| **Dockerfile + docker-compose (chosen)** | One command (`docker compose up`) to build+run+persist; easy to extend (e.g. mysql service) | Extra tool to learn; single-service topology hides multi-container patterns |
| Kubernetes / Helm | Production-grade orchestration | Overkill for a single-container ToDo app |
| No containerization | Fastest local iteration | No environment parity/isolation |

- **Rationale:** needed a reproducible build/run without a local Node install; Compose gives volume management "for free" for the file-based sqlite persistence.

**Audit notes / risks:**
- `Dockerfile` runs `RUN npm test` **during image build** — fails fast, but requires valid test env vars (e.g. `SQLITE_DB_LOCATION`) at build time.
- `docker-compose.yml` only declares the sqlite path (no `MYSQL_HOST`) — `src/database/mysql.js` is dead code unless a `mysql` service/env vars are added.

---

## 2. Continuous Integration: GitHub Actions

- **Baseline:** no CI configuration.
- **Decision:** added `lint.yml` / `test.yml` / `docker-publish.yml` — on push/PR: checkout, Node 22 setup (npm cache), `npm ci`, `npm test` (sqlite → temp file), `docker compose build`.

| Option | Pros | Cons |
|---|---|---|
| **GitHub Actions (chosen)** | Native to GitHub, free, YAML lives with code, huge ecosystem | Vendor lock-in; quirks (e.g. `"on":` needs quoting) |
| GitLab CI / Bitbucket Pipelines | Similar features | Irrelevant — repo isn't hosted there |
| Jenkins | Full control, self-hosted | Needs infra to host/maintain |
| CircleCI / Travis | Mature, good caching | Extra external account/secrets for no gain here |
| No CI (local/hook only) | Zero setup | No protection against "works on my machine" |

- **Rationale:** repo already on GitHub — zero extra accounts, secrets managed in one place, pipeline doubles as living docs.
- **Follow-up fix (`2463d94`, "delete sudo in ci.yml"):** removed unnecessary `sudo` from `docker compose build` — `ubuntu-latest` runner's `docker` group already has permissions; minor robustness fix, not a design trade-off.

---

## 3. Pre-commit hook: Husky

- **Baseline:** no git hooks; nothing enforced tests before commit.
- **Decision:** added [.husky/pre-commit](.husky/pre-commit) running `npm test`, wired via `prepare: husky` npm script (auto-installs on `npm install`).

| Option | Pros | Cons |
|---|---|---|
| **Husky (chosen)** | Standard JS tool; auto-installs via `npm prepare`; hook scripts versioned in repo | Extra dependency; slows every commit; bypassable with `--no-verify` |
| Plain `.git/hooks/pre-commit` | No dependency | Not versioned/shared automatically |
| `lint-staged` + Husky | Faster, only checks staged files | No linter configured yet; extra setup for marginal benefit |
| `pre-commit` (Python framework) | Powerful multi-language hook manager | Adds Python toolchain to a pure-JS project |
| CI-only enforcement | No commit friction | Broken tests caught only after push |

- **Rationale:** CI already runs tests; the hook is a fast-feedback complement, worth the small commit slowdown for a small suite.

---

## 4. Test runner: Jest, wired into `npm test`

- **Baseline:** `spec/` folder existed with Jest-style `test()`/`expect()` syntax, but no `test` script and no `jest` dependency — not runnable via `npm test`.
- **Decision:** added `jest` dependency + `"test": "jest"` script.

| Option | Pros | Cons |
|---|---|---|
| **Jest (chosen)** | Specs already used its API; zero-config for CommonJS; built-in mocking/coverage | Slightly heavier install |
| Mocha + Chai + Sinon | Flexible, modular | Would require rewriting existing spec assertions |
| Node.js built-in `node:test` | Zero extra dependency | `assert` API differs from `expect`; still needs rewrites |
| Vitest | Fast, modern | Built for ESM/Vite; mismatch for this CommonJS app |

- **Rationale:** specs already targeted Jest's API — only option requiring zero rewriting of existing tests.

---

## 5. Spec folder layout: `spec/routes` → `spec/tests`

- **Baseline:** `spec/routes/*.spec.js` (route tests) + `spec/persistence/sqlite.spec.js`.
- **Decision (`e78ff22`):** renamed `spec/routes` → `spec/tests` (`spec/persistence` unchanged).
- **Rationale:** naming/organization preference — kept tests separate from source (matches baseline split, which Dockerfile depends on) but generalized the folder name.

---

## 6. Source layout: `persistence/` → `database/`, static assets moved under `front/`

- **Baseline:** `src/persistence/{index,mysql,sqlite}.js`, top-level `src/static/...`.
- **Decision (`dac56f3`, "First changes to the architecture"):** renamed `src/persistence` → `src/database`; moved `src/static` → `src/front/static`.
- **Rationale:** early naming/organization clarity, done before other features were layered on top, to establish structure for later work (`front/static` groups everything served to the browser, `database/` groups everything talking to storage).

---

## 7. Domain model: item-based ToDo → Kanban (projects/columns/tasks)

- **Baseline:** single flat `items` table/route set (`addItem`, `getItems`, `updateItem`, `deleteItem`).
- **Decision:** replaced with a 3-entity Kanban model — `projects` → `columns` → `tasks` (each with its own routes: `add/get/update/delete{Project,Column,Task}`), foreign keys cascading on delete.
- **Rationale:** the product direction moved from a single-list ToDo app to a Kanban board, which needs a real hierarchy (project contains columns, columns contain tasks) rather than one flat table.

---

## 8. Authentication: JWT + bcrypt password hashing

- **Baseline:** no authentication — `auth.js` middleware didn't exist as a security boundary.
- **Decision:** added `bcryptjs` for password hashing (`signup`/`login`) and `jsonwebtoken` for stateless auth — [src/middleware/auth.js](src/middleware/auth.js) validates a `Bearer` token and attaches `req.user`.

| Option | Pros | Cons |
|---|---|---|
| **JWT + bcrypt (chosen)** | Stateless (no server-side session store needed); `bcrypt` is the standard for password hashing; scales horizontally without sticky sessions | Token revocation is hard (no server-side session to invalidate); secret defaults to `'changeme'` if `JWT_SECRET` isn't set — must be enforced in prod |
| Session cookies + server-side store | Easy revocation, simpler mental model | Needs a session store (Redis/DB), doesn't scale statelessly |
| OAuth / third-party identity provider | Offloads credential storage/security | Overkill for a small internal-style app; adds external dependency |

- **Rationale:** stateless JWT fits the containerized/horizontally-scalable direction of the app without needing a shared session store.

---

## 9. API Documentation: OpenAPI (swagger-jsdoc) + Scalar reference UI

- **Baseline:** no API documentation.
- **Decision:** JSDoc `@openapi` annotations on each route, compiled by `swagger-jsdoc` into a spec served at `/openapi.json`, rendered with `@scalar/express-api-reference` at `/reference`.

| Option | Pros | Cons |
|---|---|---|
| **swagger-jsdoc + Scalar (chosen)** | Docs live next to route code (`@openapi` comments), stay in sync more easily; Scalar gives a modern interactive UI for free | Adds two dependencies; annotation comments can still drift from actual behavior if not kept up to date |
| Swagger UI (`swagger-ui-express`) | Very common/familiar UI | Older/heavier UI compared to Scalar; same JSDoc drift risk |
| Hand-written OpenAPI YAML/JSON file | Single source of truth, no comment/code drift | Easy to forget updating when routes change; duplicated info vs inline JSDoc |
| No formal docs (README only) | Zero overhead | Harder for API consumers to discover routes/schemas |

- **Rationale:** colocating spec annotations with route handlers keeps documentation close to the code it describes, and Scalar was chosen over Swagger UI for a more modern out-of-the-box reference page.

---

## 10. Linting: ESLint

- **Baseline:** no linter configured.
- **Decision:** added [eslint.config.js](eslint.config.js) (flat config) with `eslint.configs.recommended`, Node globals for `src/`, Jest globals for `spec/**`, and browser/JSX globals for `src/front/**`; wired as `npm run lint` and its own CI workflow.

| Option | Pros | Cons |
|---|---|---|
| **ESLint flat config (chosen)** | Current ESLint standard config format; per-folder override blocks (Node/Jest/browser globals) fit the mixed backend+front-end codebase | Flat config is newer/less familiar than legacy `.eslintrc` |
| No linter | Zero setup | No consistent style/error-catching across contributors |

- **Rationale:** the codebase mixes CommonJS Node routes, Jest specs, and browser/JSX front-end code — flat config's per-glob overrides handle all three global environments cleanly in one file.

---

## 11. Domain events: `EventEmitter`-based event bus

- **Baseline:** no eventing/pub-sub layer — route handlers did everything inline (including any side effects).
- **Decision:** added [src/events](src/events) — a process-wide `EventEmitter` singleton ([eventBus.js](src/events/eventBus.js)) with typed event names ([eventTypes.js](src/events/eventTypes.js)) and independent listeners (starting with an audit logger, [listeners/auditLogger.js](src/events/listeners/auditLogger.js)) registered in [index.js](src/events/index.js).

| Option | Pros | Cons |
|---|---|---|
| **In-process `EventEmitter` bus (chosen)** | Zero extra infra (no message broker); listeners decoupled from route logic — new consumers (websocket push, notifications) plug in without touching routes; `emit` is wrapped so a throwing listener can't crash the request | Events are lost on process restart/crash (no persistence/retry); doesn't scale across multiple app instances (in-memory only) |
| External message broker (RabbitMQ/Kafka/Redis pub-sub) | Durable, scales across instances | Major infra addition for a small app; unnecessary operational overhead here |
| Direct function calls (no event bus) | Simplest, explicit call graph | Side effects (e.g. audit logging) get tangled into route handlers, harder to extend without touching every route |

- **Rationale:** the app runs as a single process/container, so an in-memory event bus gives most of the decoupling benefit (routes fire-and-forget domain events; listeners like audit logging stay independent) without needing a broker.

---