# 4. Test runner: Jest

## Status

Accepted

## Context

A `spec/` folder existed with Jest-style `test()`/`expect()` syntax, but there was no
`test` script and no `jest` dependency, so the specs weren't runnable via `npm test`.

## Decision

Add the `jest` dependency and a `"test": "jest"` script.

## Consequences

- Specs already targeted Jest's API, so no rewriting of existing tests was needed.
- Zero-config for CommonJS, with built-in mocking/coverage.
- Slightly heavier install than some alternatives.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Jest (chosen)** | Specs already used its API; zero-config for CommonJS; built-in mocking/coverage | Slightly heavier install |
| Mocha + Chai + Sinon | Flexible, modular | Would require rewriting existing spec assertions |
| Node.js built-in `node:test` | Zero extra dependency | `assert` API differs from `expect`; still needs rewrites |
| Vitest | Fast, modern | Built for ESM/Vite; mismatch for this CommonJS app |
