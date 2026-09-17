# 6. Source layout: `persistence/` → `database/`, static assets moved under `front/`

## Status

Accepted

## Context

The baseline layout was `src/persistence/{index,mysql,sqlite}.js` with a top-level
`src/static/...` for browser-served assets.

## Decision

Rename `src/persistence` → `src/database` and move `src/static` → `src/front/static`
(commit `dac56f3`, "First changes to the architecture").

## Consequences

- `front/static` groups everything served to the browser; `database/` groups
  everything talking to storage.
- Established structural clarity early, before other features were layered on top.

## Alternatives Considered

No competing options were evaluated — this was an early naming/organization decision
made to set structure for later work rather than a technical trade-off.
