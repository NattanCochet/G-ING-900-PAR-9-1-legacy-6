# Technical Choices Audit

Baseline: [`../getting-started-app`](../getting-started-app) — Docker's official "getting started" ToDo sample
(Express + sqlite/mysql persistence layer, no tests wired up, no containerization, no CI, no docs).

Scope: current `dev` branch (see `git log`: `Original Project` → `First changes to the architecture` →
`Dockerfile/compose/CI` → `rename routes file to test` → `husky pre-commit hook` → `delete sudo in ci.yml` →
`handle missing husky in ci environment`). This document lists every architectural decision made in this
repository since it was forked from that baseline, with the options that were available, their pros/cons, and
the reasoning behind the choice actually made.

> Note: an OpenAPI/Scalar API-documentation feature exists on the separate `feat/scalar_documentation` branch
> but is **not merged into `dev`** — it is intentionally left out of this audit until it lands here.

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
  production image, and `npm ci` (not `npm ci --omit=dev`) installs `nodemon`/`husky` dev dependencies into the
  final image. This is a deviation from typical prod-image hygiene (bigger image, dev tooling shipped to prod)
  and worth revisiting (e.g. multi-stage build, `node src/index.js` as the prod `CMD`).
- `docker-compose.yml` only declares the sqlite path (no `MYSQL_HOST`), even though `src/database/mysql.js` is
  still present in the code. The mysql driver is effectively dead code in the current compose topology unless a
  `mysql` service and env vars are added later.

---

## 2. Continuous Integration: GitHub Actions

**Baseline:** no CI configuration.

**Decision:** add [.github/workflows/ci.yml](.github/workflows/ci.yml) — on every push/PR: checkout, setup
Node 22 (with npm cache), `npm ci`, `npm test` (sqlite pointed at a temp file), then `docker compose build`.

| Option | Pros | Cons |
|---|---|---|
| **GitHub Actions (chosen)** | Native to GitHub (where the repo is hosted), free for public/small repos, YAML config lives with the code, huge ecosystem of actions | Vendor lock-in to GitHub; syntax/quirks (e.g. `"on":` needed quoting to avoid YAML boolean coercion of the bare word `on`) |
| GitLab CI / Bitbucket Pipelines | Similar features | Irrelevant unless repo is hosted there |
| Jenkins | Full control, self-hosted | Requires infrastructure to host/maintain; heavy for a small project |
| CircleCI / Travis | Mature, good caching | External service, extra account/secrets management for no real gain over Actions here |
| No CI, rely on local test runs / pre-commit hook only | Zero setup | No protection against "works on my machine", no build verification before merge |

**Rationale:** GitHub Actions was the natural choice since the repo already lives on GitHub — zero extra
accounts, secrets are managed in the same place as the code, and the pipeline doubles as living documentation
of "how to build and test this project" (`npm ci && npm test && docker compose build`).

**Follow-up fix (commit `2463d94`, "delete sudo in ci.yml"):** the Docker build step originally ran
`sudo docker compose build`. On the GitHub-hosted `ubuntu-latest` runner the `docker` group already has the
necessary permissions and `sudo` is unnecessary (and can even prompt/fail depending on runner image changes) —
removing it is a small robustness fix rather than a design decision with real trade-offs.

---

## 3. Pre-commit hook: Husky

**Baseline:** no git hooks; nothing enforced test execution before a commit.

**Decision:** add [.husky/pre-commit](.husky/pre-commit) running `npm test`, wired through the `prepare: husky`
npm script (auto-installs the hook on `npm install`).

| Option | Pros | Cons |
|---|---|---|
| **Husky (chosen)** | Standard, widely known JS tool; auto-installs via `npm prepare`; keeps hook scripts versioned in the repo | Adds a dependency; slows down every commit by running the full test suite; can be bypassed with `--no-verify` |
| Plain `.git/hooks/pre-commit` script | No dependency | Not versioned/shared automatically with the team (lives outside `.git` tracked files, easy to lose on clone) |
| `lint-staged` + Husky | Only checks staged/changed files, faster | Project has no linter configured yet; would need extra setup for marginal benefit at this size |
| `pre-commit` (Python framework) | Powerful multi-language hook manager | Adds a Python toolchain dependency to a pure-JS project, unnecessary here |
| CI-only enforcement (no local hook) | No friction on commit | Broken tests only caught after push, slower feedback loop |

**Rationale:** since CI already runs the test suite, the pre-commit hook is a fast-feedback complement that
catches broken tests before they're even pushed, at the cost of a slightly slower commit — an acceptable
trade-off for a small test suite.

**Follow-up fix (commit `3e46eb3`, "handle missing husky in ci environment"):** the initial hook commit added
`.husky/pre-commit` and the `prepare: husky` script, but never actually declared `husky` as a `devDependency`
in `package.json`/`package-lock.json`. Locally this worked if `husky` happened to already be in `node_modules`
from a global install or prior state, but a clean `npm ci` in CI (or on a fresh clone) had no `husky` binary to
run `prepare` with, breaking `npm ci`/`npm install`. Declaring `husky` explicitly as a `devDependency` fixed
reproducibility — a reminder that anything referenced by a lifecycle script must be a declared dependency, not
an assumption about the local environment.

---

## 4. Test runner: Jest, wired into `npm test`

**Baseline:** the `spec/` folder already existed in the tutorial's source (using Jest-style `test()`/`expect()`
syntax) but the baseline `package.json` had **no `test` script and no `jest` dependency** — the tests were not
actually runnable via `npm test` out of the box.

**Decision:** add `jest` as a dependency and `"test": "jest"` script, making the existing spec files
executable and enforceable in CI/hooks.

| Option | Pros | Cons |
|---|---|---|
| **Jest (chosen)** | Test files already used its `test`/`expect` API; zero-config for CommonJS projects; built-in mocking/coverage | Slightly heavier install than minimal alternatives |
| Mocha + Chai + Sinon | Very flexible, modular | Would require rewriting existing spec files (different assertion API), more config wiring |
| Node.js built-in `node:test` | Zero extra dependency | Project already targets a `test()`/`expect()` API matching Jest; would still require rewriting assertions (`assert` module differs from `expect`) |
| Vitest | Fast, modern | Designed around ESM/Vite projects; this is a plain CommonJS Express app, not worth the mismatch |

**Rationale:** the spec files were already written against Jest's API, so adopting Jest was the only option
that required zero rewriting of existing tests — pure "finish wiring up what was already there."

---

## 5. Spec folder layout: `spec/routes` → `spec/tests`

**Baseline:** `spec/routes/*.spec.js` (route-level tests) and `spec/persistence/sqlite.spec.js`.

**Decision:** commit `e78ff22` renamed `spec/routes` to `spec/tests` (persistence tests stayed at
`spec/persistence`).

| Option | Pros | Cons |
|---|---|---|
| **`spec/tests` (chosen)** | Generic name that doesn't imply the tests only cover HTTP routes, in case non-route unit tests are added later under the same folder | Loses the immediate self-documenting mapping "these tests exercise `src/routes/`" that the original name gave for free |
| Keep `spec/routes` | Mirrors `src/routes/` 1:1, most discoverable naming | Less accurate if the folder later grows tests for controllers/services that aren't strictly HTTP routes |
| Co-locate tests next to source (`src/routes/addItem.test.js`) | Very common modern convention, easy to find the test for a given file | Bigger structural change from the baseline; mixes test and prod code in the same tree, which `Dockerfile`'s `COPY src ./src` / `COPY spec ./spec` split was built around |

**Rationale:** a naming/organization preference — kept tests separate from source (matching the baseline's
`spec/` split, which the Dockerfile also depends on) but generalized the folder name.

---

## 6. Source layout: `persistence/` → `database/`, static assets moved under `front/`

**Baseline:** `src/persistence/{index,mysql,sqlite}.js` and `src/static/...`.

**Decision (commit `dac56f3`, "First changes to the architecture"):** rename `src/persistence` to
`src/database`, and move `src/static` to `src/front/static`.

| Option | Pros | Cons |
|---|---|---|
| **`database/` + `front/` (chosen)** | `database` is a more common/explicit name for a data-access layer than the more abstract "persistence"; nesting static assets under `front/` groups all client-facing code together and leaves room for future front-end tooling (build step, separate front-end package, etc.) under the same namespace | Pure rename with no behavior change — churn in git history and import paths for naming preference only; "persistence" is arguably a more precise term than "database" since the module also has to support swapping backends (sqlite/mysql), not just "a database" |
| Keep baseline names (`persistence/`, top-level `static/`) | No churn, matches upstream tutorial exactly (easier to diff against upstream later) | N/A — this is what was replaced |
| Full layered architecture (`controllers/`, `services/`, `repositories/`) | Scales better for larger apps, clearer separation of concerns | Massive over-engineering for a 4-route ToDo API; not justified at this size |

**Rationale:** naming/organization clarity preference early in the project ("first changes to the
architecture"), done before other features were layered on top, to establish the structure the rest of the
work would build on (e.g., `front/static` groups everything served to the browser, `database/` groups
everything talking to storage).

---

## 7. Dependency version choices

**Baseline:** `sqlite3: ^5.1.7`, no `jest`, no `husky`.

**Decision:** bump `sqlite3` to `^6.0.1`, add `jest ^30.5.1` and `husky ^9.1.7`. `overrides` block (transitive
dependency pins for `tar`, `glob`, `semver`, `cross-spawn`, `braces`, `http-cache-semantics`, `socks`) was kept
identical to the baseline.

| Consideration | Notes |
|---|---|
| **Bumping `sqlite3` major version (5→6)** | Pro: picks up security/native-binding fixes and continued maintenance. Con: major version bumps can change native binding/ABI behavior; the existing `spec/persistence/sqlite.spec.js` tests are the safety net that were relied on to confirm the bump didn't break the storage layer. |
| **Keeping the `overrides` block unchanged** | These are transitive-dependency security pins inherited from the baseline (npm audit style patches). Carrying them forward as-is is the correct, low-risk choice — no reason to touch pins unrelated to the new features being added. |

---

## 8. Port configurability

**Baseline:** `app.listen(3000, ...)` — hardcoded port.

**Decision:** `app.listen(process.env.PORT || 3000, ...)` in [src/index.js](src/index.js#L31).

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
| 2 | GitHub Actions CI | Added | New capability |
| 3 | Husky pre-commit hook | Added | New capability |
| 4 | Jest wired to `npm test` | Fixed/completed | Baseline gap fix |
| 5 | `spec/routes` → `spec/tests` | Renamed | Naming |
| 6 | `persistence/` → `database/`, static → `front/static` | Renamed/moved | Naming/structure |
| 7 | `sqlite3` 5→6, `jest`/`husky` dev deps | Upgraded/added | Maintenance |
| 8 | `process.env.PORT` fallback | Hardened | Small robustness fix |
| — | CI: removed `sudo` from Docker build step | Fixed | CI robustness fix |
| — | CI: declared `husky` as an explicit `devDependency` | Fixed | Reproducibility fix |

**Untouched from baseline:** database driver logic itself (`src/database/{mysql,sqlite}.js` bodies are
functionally identical to `../getting-started-app`'s `persistence/{mysql,sqlite}.js`), all route handler logic
(`getItems`/`updateItem`/`deleteItem`), the front-end (`app.js`, React via CDN scripts, Bootstrap), and the
mysql/sqlite auto-selection strategy in `database/index.js` (`if (process.env.MYSQL_HOST) ... else sqlite`).
