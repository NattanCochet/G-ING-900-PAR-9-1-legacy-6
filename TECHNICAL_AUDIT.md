# Technical Choices Audit

Baseline: [`../getting-started-app`](../getting-started-app) — Docker's official "getting started" ToDo sample
(Express + sqlite/mysql persistence layer, no tests wired up, no containerization, no CI, no docs, no auth).

Scope: current `dev` branch. This document lists every architectural decision made in this repository since it
was forked from that baseline, with the options that were available, their pros/cons, and the reasoning behind
the choice actually made.

---

## 1. Containerization: Docker + Docker Compose

**Baseline:** no `Dockerfile`, no `docker-compose.yml` at all — the app was expected to be run with plain
`npm` or wired manually into Docker as an exercise for the tutorial reader.

**Decision:** add [src/Dockerfile](src/Dockerfile) and [docker-compose.yml](docker-compose.yml), single `app`
service, sqlite-backed, with a named volume (`todo-data:/data`) for persistence.

| Option | Pros | Cons |
|---|---|---|
| **Dockerfile + docker-compose (chosen)** | Declarative, one command (`docker compose up`) to build+run+persist volumes; easy to extend with more services (e.g. mysql) later | Compose adds a layer of indirection beginners must learn; single-service topology hides the multi-container patterns the original tutorial teaches |
| Plain `Dockerfile`, run with `docker run` | Simpler mental model, no extra tool | Volume/network flags must be remembered/scripted manually; harder to reproduce consistently across machines |
| Kubernetes manifests / Helm chart | Production-grade orchestration, scaling, rolling updates | Massive overkill for a single-container ToDo app; steep learning curve, not worth the complexity here |
| No containerization, rely on local Node/npm | Fastest local iteration | No environment parity, no isolation, harder to demo/ship |

**Rationale:** the project needed a reproducible way to build and run the app without depending on a local
Node install, and Compose gives volume management "for free" (named volume for the sqlite file), which matters
since sqlite persistence is file-based and must survive container restarts.

**Audit notes / risks found:**
- The `Dockerfile` runs `RUN npm test` **during the image build**. This fails the build fast if tests break
  (good for CI-as-code), but it means the image cannot be built without a working test suite, and test
  environment variables (e.g. `SQLITE_DB_LOCATION`) must be valid at build time.
- `ENV NODE_ENV=production` is set, but `CMD ["npx", "nodemon", ...]` still runs the **dev** file-watcher in the
  production image, and `npm ci` (not `npm ci --omit=dev`) installs `nodemon`/`husky`/`eslint` dev dependencies
  into the final image. This is a deviation from typical prod-image hygiene (bigger image, dev tooling shipped
  to prod) and worth revisiting (e.g. multi-stage build, `node src/index.js` as the prod `CMD`).
- `src/database/index.js` now unconditionally does `module.exports = require('./sqlite')` (see §9 below) — the
  `mysql` service was never added to `docker-compose.yml` either, so `src/database/mysql.js` is dead code in
  both the code path and the container topology.

---

## 2. Continuous Integration: GitHub Actions

**Baseline:** no CI configuration.

**Decision:** add [.github/workflows/ci.yml](.github/workflows/ci.yml) — on every push/PR: checkout, setup
Node 22 (with npm cache), `npm ci`, `npm run lint`, `npm test` (sqlite pointed at a temp file), then
`docker compose build`.

| Option | Pros | Cons |
|---|---|---|
| **GitHub Actions (chosen)** | Native to GitHub (where the repo is hosted), free for public/small repos, YAML config lives with the code, huge ecosystem of actions | Vendor lock-in to GitHub; syntax/quirks (e.g. `"on":` needed quoting to avoid YAML boolean coercion of the bare word `on`) |
| GitLab CI / Bitbucket Pipelines | Similar features | Irrelevant unless repo is hosted there |
| Jenkins | Full control, self-hosted | Requires infrastructure to host/maintain; heavy for a small project |
| CircleCI / Travis | Mature, good caching | External service, extra account/secrets management for no real gain over Actions here |
| No CI, rely on local test runs / pre-commit hook only | Zero setup | No protection against "works on my machine", no build verification before merge |

**Rationale:** GitHub Actions was the natural choice since the repo already lives on GitHub — zero extra
accounts, secrets are managed in the same place as the code, and the pipeline doubles as living documentation
of "how to build and test this project" (`npm ci && npm run lint && npm test && docker compose build`).

**Follow-up fixes:**
- `sudo` was removed from the Docker build step — on the GitHub-hosted `ubuntu-latest` runner the `docker`
  group already has the necessary permissions and `sudo` is unnecessary (and can even prompt/fail depending on
  runner image changes).
- A corrupted `package-lock.json` that broke `npm ci` in CI was fixed once the scalar-documentation branch
  merged, and the mysql test suite's "connected to host undefined" failure was fixed by making the host
  configurable via an environment variable instead of being hardcoded.

---

## 3. Frontend auditing: Lighthouse CI

**Baseline:** no automated performance/accessibility/SEO checks of any kind.

**Decision:** add a separate [.github/workflows/lighthouse.yml](.github/workflows/lighthouse.yml) workflow plus
[.lighthouserc.json](.lighthouserc.json): boots the app with a temp sqlite DB, waits for port 3000, then runs
`treosh/lighthouse-ci-action` against `/login` and `/register` (3 runs each) and asserts minimum scores.

| Option | Pros | Cons |
|---|---|---|
| **Lighthouse CI, separate workflow (chosen)** | Keeps slow/flaky browser-based audits isolated from the fast unit-test/build pipeline in `ci.yml`; a Lighthouse failure doesn't block the core test-and-build signal | Requires a headless Chrome/Chromium in the runner (bundled with the action); Lighthouse has no Firefox support, so this can only validate Chromium rendering |
| Add Lighthouse steps inside the existing `ci.yml` job | Single workflow file, one place to look | Couples an unrelated, slower concern (perf/SEO) to the core build gate; a flaky Lighthouse run would block merges for reasons unrelated to correctness |
| Manual/local-only Lighthouse runs (no CI) | Zero CI cost | No regression protection, easy to forget before shipping a front-end change |

**Rationale:** the app gained real rendered pages (`/login`, `/register`) once auth and the front-end were
added (see §9, §11), making them worth auditing for accessibility and performance; a dedicated workflow keeps
that concern decoupled from the pass/fail signal of `ci.yml`. Accessibility assertions are set to `error`
(build-breaking), while performance/best-practices/SEO are `warn`-only until the app is tuned enough to commit
to hard thresholds there.

---

## 4. Pre-commit hook: Husky

**Baseline:** no git hooks; nothing enforced test execution before a commit.

**Decision:** add [.husky/pre-commit](.husky/pre-commit) running `npm test`, wired through the `prepare: husky`
npm script (auto-installs the hook on `npm install`).

| Option | Pros | Cons |
|---|---|---|
| **Husky (chosen)** | Standard, widely known JS tool; auto-installs via `npm prepare`; keeps hook scripts versioned in the repo | Adds a dependency; slows down every commit by running the full test suite; can be bypassed with `--no-verify` |
| Plain `.git/hooks/pre-commit` script | No dependency | Not versioned/shared automatically with the team (lives outside `.git` tracked files, easy to lose on clone) |
| `lint-staged` + Husky | Only checks staged/changed files, faster | Would need extra wiring for marginal benefit at this project size |
| `pre-commit` (Python framework) | Powerful multi-language hook manager | Adds a Python toolchain dependency to a pure-JS project, unnecessary here |
| CI-only enforcement (no local hook) | No friction on commit | Broken tests only caught after push, slower feedback loop |

**Rationale:** since CI already runs the test suite, the pre-commit hook is a fast-feedback complement that
catches broken tests before they're even pushed, at the cost of a slightly slower commit — an acceptable
trade-off for a small test suite.

**Follow-up fix:** the initial hook commit added `.husky/pre-commit` and the `prepare: husky` script, but never
actually declared `husky` as a `devDependency`. Locally this worked if `husky` happened to already be in
`node_modules` from a global install or prior state, but a clean `npm ci` in CI (or on a fresh clone) had no
`husky` binary to run `prepare` with, breaking `npm ci`/`npm install`. Declaring `husky` explicitly as a
`devDependency` fixed reproducibility — a reminder that anything referenced by a lifecycle script must be a
declared dependency, not an assumption about the local environment.

---

## 5. Linting: ESLint

**Baseline:** no linter configuration at all.

**Decision:** add [eslint.config.js](eslint.config.js) (flat config) with `eslint.configs.recommended`, Node
globals for `src/`, Jest globals for `spec/`, and browser + JSX/React-CDN globals for `src/front/`; wired into
`npm run lint` and into `ci.yml`.

| Option | Pros | Cons |
|---|---|---|
| **ESLint flat config (chosen)** | Modern config format going forward, per-folder `languageOptions`/globals overrides map cleanly onto this project's mixed environments (Node backend, Jest specs, browser-side React-via-CDN front-end) | Flat config is newer/less documented than the legacy `.eslintrc` format |
| Legacy `.eslintrc.*` | More existing examples/tutorials online | Being phased out upstream; new projects are steered towards flat config |
| Prettier only (formatting, no lint rules) | Simple, opinionated formatting | Doesn't catch actual bugs (unused vars, undefined globals, etc.) the way `eslint:recommended` does |
| No linter | Zero setup | No consistency enforcement, easy to ship accidental bugs (e.g. undeclared globals) that a linter would catch for free |

**Rationale:** three very different execution environments coexist in one repo (Node/CommonJS backend, Jest
test globals, browser-side React loaded via `<script>` CDN tags) — a single flat-config file with per-glob
overrides was the cleanest way to lint all of them correctly without false positives (e.g. flagging `React` as
undefined in front-end files).

---

## 6. Test runner: Jest, wired into `npm test`

**Baseline:** the `spec/` folder already existed in the tutorial's source (using Jest-style `test()`/`expect()`
syntax) but the baseline `package.json` had **no `test` script and no `jest` dependency** — the tests were not
actually runnable via `npm test` out of the box.

**Decision:** add `jest` as a dependency and `"test": "jest"` script. Coverage has since grown far beyond the
baseline item-CRUD routes to also cover: `authMiddleware`, `login`, `signup`, `deleteUser`, and both the
`sqlite` and `mysql` driver implementations directly (`spec/tests/sqlite.spec.js`, `mysql.spec.js`).

| Option | Pros | Cons |
|---|---|---|
| **Jest (chosen)** | Test files already used its `test`/`expect` API; zero-config for CommonJS projects; built-in mocking/coverage | Slightly heavier install than minimal alternatives |
| Mocha + Chai + Sinon | Very flexible, modular | Would require rewriting existing spec files (different assertion API), more config wiring |
| Node.js built-in `node:test` | Zero extra dependency | Project already targets a `test()`/`expect()` API matching Jest; would still require rewriting assertions (`assert` module differs from `expect`) |
| Vitest | Fast, modern | Designed around ESM/Vite projects; this is a plain CommonJS Express app, not worth the mismatch |

**Rationale:** the spec files were already written against Jest's API, so adopting Jest was the only option
that required zero rewriting of existing tests — pure "finish wiring up what was already there," extended
naturally as new features (auth, mysql driver parity) needed coverage.

---

## 7. Spec folder layout: `spec/routes` → `spec/tests`

**Baseline:** `spec/routes/*.spec.js` (route-level tests) and `spec/persistence/sqlite.spec.js`.

**Decision:** `spec/routes` was renamed to `spec/tests`, and the persistence-layer specs (`sqlite.spec.js`,
`mysql.spec.js`) were later consolidated into the same `spec/tests` folder alongside the route/middleware specs,
rather than kept in a separate `spec/persistence` directory.

| Option | Pros | Cons |
|---|---|---|
| **Single flat `spec/tests` (chosen)** | One obvious place to look for any test in the project, regardless of whether it targets a route, middleware, or a database driver; generic name doesn't imply route-only coverage | Loses the immediate self-documenting split between "route tests" and "persistence tests" that two folders gave for free; a growing suite could get harder to scan flatly |
| Keep `spec/routes` + `spec/persistence` split | Mirrors `src/routes/` and `src/database/` 1:1, most discoverable naming | Doesn't scale as cleanly once middleware (`authMiddleware.spec.js`) and driver parity tests (`mysql.spec.js`) don't map to either folder name |
| Co-locate tests next to source (`src/routes/addItem.test.js`) | Very common modern convention, easy to find the test for a given file | Bigger structural change from the baseline; mixes test and prod code in the same tree, which `Dockerfile`'s `COPY src ./src` / `COPY spec ./spec` split was built around |

**Rationale:** a naming/organization preference — kept tests separate from source (matching the baseline's
`spec/` split, which the Dockerfile also depends on) but flattened into one folder as new test categories
(middleware, driver-parity) stopped mapping cleanly to a two-folder split.

---

## 8. Source layout: `persistence/` → `database/`, static assets moved under `front/`

**Baseline:** `src/persistence/{index,mysql,sqlite}.js` and `src/static/...`.

**Decision:** rename `src/persistence` to `src/database`, and move `src/static` to `src/front/static` (later
joined by `src/front/views/*.ejs` for server-rendered login/register/home pages, see §11).

| Option | Pros | Cons |
|---|---|---|
| **`database/` + `front/` (chosen)** | `database` is a more common/explicit name for a data-access layer than the more abstract "persistence"; nesting static assets and views under `front/` groups all client-facing code together | Pure rename with no behavior change — churn in git history and import paths for naming preference only; "persistence" is arguably a more precise term since the module also has to support swapping backends (sqlite/mysql), not just "a database" |
| Keep baseline names (`persistence/`, top-level `static/`) | No churn, matches upstream tutorial exactly (easier to diff against upstream later) | N/A — this is what was replaced |
| Full layered architecture (`controllers/`, `services/`, `repositories/`) | Scales better for larger apps, clearer separation of concerns | Over-engineering for this size of app; not justified even with the auth feature added |

**Rationale:** naming/organization clarity preference established early ("first changes to the architecture"),
before other features were layered on top, so `front/` could later absorb both static assets and EJS views, and
`database/` could absorb the new `users` table logic (§9) alongside the existing `todo_items` logic.

---

## 9. Authentication: JWT + bcrypt, SQLite-backed `users` table

**Baseline:** no authentication or authorization whatsoever — every item route was open/anonymous.

**Decision:** add a `users` table ([src/database/queries.js](src/database/queries.js)), `POST /signup` /
`POST /login` / `DELETE /users/:id` routes ([src/routes/signup.js](src/routes/signup.js),
[src/routes/login.js](src/routes/login.js), [src/routes/deleteUser.js](src/routes/deleteUser.js)), and a
[src/middleware/auth.js](src/middleware/auth.js) Express middleware that verifies a `Bearer` JWT and populates
`req.user`. All `/items` routes and `DELETE /users/:id` now require a valid token. Passwords are hashed with
`bcryptjs` before storage; JWTs are signed with `process.env.JWT_SECRET` (falling back to the literal
`'changeme'` if unset).

| Option | Pros | Cons |
|---|---|---|
| **JWT (stateless) + bcrypt (chosen)** | No server-side session store needed (fits a single-instance container with no shared session cache); `bcryptjs` is a pure-JS implementation with no native build step, matching the rest of the dependency tree | Tokens can't be revoked before expiry without an extra denylist store; the `'changeme'` fallback secret is a real risk if `JWT_SECRET` is ever left unset in a real deployment |
| Server-side sessions (`express-session` + a store) | Revocable at any time, simpler mental model for logout | Needs a shared session store (Redis/DB) to work across multiple instances; more moving parts for a project this size |
| OAuth / third-party identity provider | No password storage/liability at all | Way over-scoped for a ToDo app; requires external accounts/config |
| No auth (baseline) | Simplest | Anyone can read/write/delete any item; unacceptable once the app is exposed beyond localhost |

**Rationale:** a stateless JWT fits the existing single-container, no-shared-cache deployment model without
adding new infrastructure, and `bcryptjs` avoids adding a native-compiled dependency (unlike `bcrypt`) on top of
the existing `sqlite3` native binding.

**Audit notes / risks found:**
- The `'changeme'` fallback secret in both [auth.js](src/middleware/auth.js) and the login/signup routes means
  a misconfigured deployment (missing `JWT_SECRET`) would silently sign and verify tokens with a well-known
  default instead of failing fast — worth changing to throw/refuse to start if `JWT_SECRET` is unset outside
  tests.
- `src/database/index.js` was changed to unconditionally `require('./sqlite')` when the auth feature was added,
  silently removing the baseline's `MYSQL_HOST`-based driver selection. `src/database/mysql.js` still exists
  and is still unit-tested directly ([spec/tests/mysql.spec.js](spec/tests/mysql.spec.js)), but it can no
  longer be selected at runtime through `database/index.js` — this is effectively dead code in production
  today, not just "unless a `mysql` service is added," and should be flagged as a regression or an intentional,
  documented decision.

---

## 10. API documentation: Scalar + swagger-jsdoc

**Baseline:** no API documentation of any kind.

**Decision:** generate an OpenAPI 3.1 spec from JSDoc comments in `src/routes/*.js` using `swagger-jsdoc`,
serve it at `GET /openapi.json`, and render an interactive reference UI at `/reference` using
`@scalar/express-api-reference`.

| Option | Pros | Cons |
|---|---|---|
| **swagger-jsdoc + Scalar (chosen)** | Docs live next to the route handlers as comments (low drift risk); Scalar gives a modern, interactive "try it" UI for free with almost no config | Relies on developers keeping JSDoc annotations accurate/up to date; no compile-time check that the spec matches the actual handler behavior |
| Hand-written static OpenAPI YAML/JSON | Full control over the spec | Easy for the spec to drift from the actual code since nothing forces them to stay in sync |
| Swagger UI (instead of Scalar) | Extremely well-known, battle-tested | Older/heavier UI; Scalar was chosen for a more modern look/UX at similar setup cost |
| No API docs | Zero effort | Harder for any consumer (including the front-end team) to discover the available endpoints/contracts |

**Rationale:** co-locating documentation with the route handlers it describes was the lowest-friction way to
keep docs from rotting, and Scalar's drop-in Express middleware made the interactive UI essentially free once
the JSDoc annotations existed.

---

## 11. Front-end: server-rendered EJS pages + React (via CDN)

**Baseline:** a single static bundle (`src/static/js/app.js`) using React/ReactDOM loaded from CDN `<script>`
tags and Babel-in-browser JSX compilation, with no login/auth UI — the tutorial's ToDo list was fully
anonymous.

**Decision:** add server-rendered EJS views ([src/front/views/login.ejs](src/front/views/login.ejs),
[register.ejs](src/front/views/register.ejs), [index.ejs](src/front/views/index.ejs)) served from
`GET /login`, `GET /register`, `GET /home`, plus dedicated `auth.css` styling and Bootstrap for layout. The
existing React-via-CDN ToDo list (`app.js`) now runs on top of the JWT-authenticated `/items` API instead of an
anonymous one.

| Option | Pros | Cons |
|---|---|---|
| **EJS views + React-via-CDN kept as-is (chosen)** | No build step/bundler needed anywhere in the stack (matches the baseline's "no build tooling" philosophy); adding EJS templates for the new auth pages was the smallest change that fit the existing `res.render`-free, static-file-serving Express setup | In-browser Babel/JSX compilation (`babel.min.js`) is noticeably slower than a build-time compile step and ships a large runtime to the client; no component reuse/state management library as the UI grows |
| Migrate to a bundler (Vite/Webpack) + a framework build step | Faster runtime, smaller shipped JS, modern DX (HMR, code splitting) | Adds a whole new toolchain (config, build step in CI/Dockerfile, `node_modules`-heavy front-end deps) for marginal gains on a small ToDo UI |
| Server-rendered only (no React), plain EJS + vanilla JS | Simplest possible, smallest payload | Would require rewriting the existing interactive ToDo list from scratch |

**Rationale:** the baseline's zero-build-step approach was preserved to minimize new tooling surface; the new
auth pages needed *some* server-side templating to conditionally render (e.g. redirect logic) and to serve
polished login/register forms, and EJS was the smallest addition that didn't require a rewrite of the existing
React-via-CDN ToDo list or a build pipeline.

---

## 12. Port configurability

**Baseline:** `app.listen(3000, ...)` — hardcoded port.

**Decision:** `app.listen(process.env.PORT || 3000, ...)` in [src/index.js](src/index.js).

| Option | Pros | Cons |
|---|---|---|
| **Env-configurable with fallback (chosen)** | Works out of the box with zero config (matches baseline behavior) while allowing overrides for container platforms that inject a `PORT` env var (Heroku-style PaaS, some k8s setups) | One extra line, negligible complexity |
| Hardcoded port (baseline) | Simplest possible | Cannot be reconfigured without editing code; brittle for deployment targets that require binding to a platform-assigned port |
| Config file (e.g. `.env` + `dotenv`) | Central place for all config | Overkill for a single value; adds a dependency and a file to manage for one env var |

**Rationale:** a minimal, low-risk hardening change that costs nothing when unset (still defaults to 3000,
identical to baseline) but unblocks deployment to environments that assign ports dynamically — relevant since
the project also added Docker/Compose deployment in the same effort.

---

## Summary table

| # | Choice | vs Baseline | Type |
|---|---|---|---|
| 1 | Docker + Docker Compose | Added | New capability |
| 2 | GitHub Actions CI (`ci.yml`) | Added | New capability |
| 3 | Lighthouse CI (`lighthouse.yml`) | Added | New capability |
| 4 | Husky pre-commit hook | Added | New capability |
| 5 | ESLint (flat config) | Added | New capability |
| 6 | Jest wired to `npm test`, coverage expanded | Fixed/completed, then grown | Baseline gap fix |
| 7 | `spec/routes`+`spec/persistence` → single `spec/tests` | Renamed/merged | Naming/structure |
| 8 | `persistence/` → `database/`, static → `front/static` | Renamed/moved | Naming/structure |
| 9 | JWT + bcrypt auth, `users` table | Added | New capability |
| 10 | Scalar + swagger-jsdoc API docs | Added | New capability |
| 11 | Server-rendered login/register EJS pages | Added | New capability |
| 12 | `process.env.PORT` fallback | Hardened | Small robustness fix |
| — | CI: removed `sudo` from Docker build step | Fixed | CI robustness fix |
| — | CI: declared `husky` as an explicit `devDependency` | Fixed | Reproducibility fix |
| — | CI: fixed corrupted `package-lock.json` blocking `npm ci` | Fixed | Reproducibility fix |
| — | Tests: fixed mysql tests connecting to host `undefined` | Fixed | Test reliability fix |

**Untouched from baseline:** the item-route handler logic itself (`getItems`/`addItem`/`updateItem`/
`deleteItem`) is functionally the same CRUD-over-`todo_items` as the tutorial, now simply gated behind the new
`auth` middleware; the React-via-CDN rendering approach (`app.js`, Bootstrap, in-browser Babel) was kept rather
than replaced with a bundler.
