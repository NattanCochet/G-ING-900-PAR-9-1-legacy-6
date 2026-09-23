# 10. Linting: ESLint

## Status

Accepted

## Context

The baseline project had no linter configured, so there was no consistent style or
automated error-catching across the codebase.

## Decision

Add [eslint.config.js](../../eslint.config.js) (flat config) with
`eslint.configs.recommended`, Node globals for `src/`, Jest globals for `spec/**`,
and browser/JSX globals for `src/front/**`; wired as `npm run lint` and its own CI
workflow.

## Consequences

- Per-folder override blocks (Node/Jest/browser globals) fit the mixed
  backend+front-end codebase in one config file.
- Flat config is newer/less familiar than the legacy `.eslintrc` format.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **ESLint flat config (chosen)** | Current ESLint standard config format; per-folder override blocks (Node/Jest/browser globals) fit the mixed backend+front-end codebase | Flat config is newer/less familiar than legacy `.eslintrc` |
| No linter | Zero setup | No consistent style/error-catching across contributors |
