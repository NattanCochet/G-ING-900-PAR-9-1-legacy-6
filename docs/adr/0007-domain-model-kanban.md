# 7. Domain model: item-based ToDo → Kanban (projects/columns/tasks)

## Status

Accepted

## Context

The baseline app used a single flat `items` table/route set (`addItem`, `getItems`,
`updateItem`, `deleteItem`).

## Decision

Replace the flat item model with a 3-entity Kanban model — `projects` → `columns` →
`tasks` — each with its own routes (`add/get/update/delete{Project,Column,Task}`),
with foreign keys cascading on delete.

## Consequences

- Supports a real hierarchy (project contains columns, columns contain tasks) instead
  of one flat table.
- More routes and tables to maintain than the single-entity baseline.

## Alternatives Considered

No competing data models were evaluated — the product direction moved from a
single-list ToDo app to a Kanban board, which requires this hierarchy.
