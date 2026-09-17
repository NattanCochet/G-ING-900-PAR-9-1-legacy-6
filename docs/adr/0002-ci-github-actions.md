# 2. Continuous Integration: GitHub Actions

## Status

Accepted

## Context

The baseline project had no CI configuration, so nothing verified that tests passed
or the Docker image built successfully before merging changes.

## Decision

Add `lint.yml` / `test.yml` / `docker-publish.yml` GitHub Actions workflows. On
push/PR: checkout, Node 22 setup (npm cache), `npm ci`, `npm test` (sqlite → temp
file), `docker compose build`.

## Consequences

- Native to GitHub (where the repo is already hosted) — no extra accounts, secrets
  managed in one place, pipeline doubles as living documentation.
- Vendor lock-in to GitHub Actions; some quirks (e.g. `"on":` needs quoting in YAML).

**Follow-up fix (`2463d94`, "delete sudo in ci.yml"):** removed unnecessary `sudo`
from `docker compose build` — the `ubuntu-latest` runner's `docker` group already has
permissions; a robustness fix, not a design trade-off.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **GitHub Actions (chosen)** | Native to GitHub, free, YAML lives with code, huge ecosystem | Vendor lock-in; quirks (e.g. `"on":` needs quoting) |
| GitLab CI / Bitbucket Pipelines | Similar features | Irrelevant — repo isn't hosted there |
| Jenkins | Full control, self-hosted | Needs infra to host/maintain |
| CircleCI / Travis | Mature, good caching | Extra external account/secrets for no gain here |
| No CI (local/hook only) | Zero setup | No protection against "works on my machine" |
