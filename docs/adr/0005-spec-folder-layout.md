# 5. Spec folder layout: `spec/routes` → `spec/tests`

## Status

Accepted

## Context

The baseline layout was `spec/routes/*.spec.js` (route tests) plus
`spec/persistence/sqlite.spec.js`.

## Decision

Rename `spec/routes` → `spec/tests` (commit `e78ff22`); `spec/persistence` was left
unchanged at the time.

## Consequences

- Naming/organization preference — tests stay separate from source (matching the
  baseline split, which the Dockerfile depends on) but under a more general folder
  name.

## Alternatives Considered

No competing options were evaluated — this was a naming/organization preference
rather than a technical trade-off.
