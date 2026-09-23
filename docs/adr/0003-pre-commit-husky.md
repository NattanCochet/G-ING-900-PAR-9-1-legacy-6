# 3. Pre-commit hook: Husky

## Status

Accepted

## Context

The baseline project had no git hooks, so nothing enforced running tests before a
commit landed.

## Decision

Add [.husky/pre-commit](../../.husky/pre-commit) running `npm test`, wired via a
`prepare: husky` npm script (auto-installs on `npm install`).

## Consequences

- Standard JS tooling; auto-installs via `npm prepare`; hook scripts are versioned in
  the repo.
- Adds an extra dependency and slows every commit slightly; bypassable with
  `--no-verify`.
- CI already runs tests, so the hook is a fast-feedback complement rather than the
  only safety net — worth the small commit slowdown for a small suite.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Husky (chosen)** | Standard JS tool; auto-installs via `npm prepare`; hook scripts versioned in repo | Extra dependency; slows every commit; bypassable with `--no-verify` |
| Plain `.git/hooks/pre-commit` | No dependency | Not versioned/shared automatically |
| `lint-staged` + Husky | Faster, only checks staged files | No linter configured yet (at the time); extra setup for marginal benefit |
| `pre-commit` (Python framework) | Powerful multi-language hook manager | Adds Python toolchain to a pure-JS project |
| CI-only enforcement | No commit friction | Broken tests caught only after push |
