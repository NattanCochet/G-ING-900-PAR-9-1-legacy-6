# 9. API Documentation: OpenAPI (swagger-jsdoc) + Scalar reference UI

## Status

Accepted

## Context

The baseline app had no API documentation, making it harder for consumers to
discover routes and schemas.

## Decision

Annotate each route with JSDoc `@openapi` comments, compile them with
`swagger-jsdoc` into a spec served at `/openapi.json`, and render it with
`@scalar/express-api-reference` at `/reference`.

## Consequences

- Docs live next to route code, which keeps them easier to keep in sync.
- Scalar gives a modern interactive UI for free.
- Adds two dependencies; annotation comments can still drift from actual behavior if
  not kept up to date.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **swagger-jsdoc + Scalar (chosen)** | Docs live next to route code (`@openapi` comments), stay in sync more easily; Scalar gives a modern interactive UI for free | Adds two dependencies; annotation comments can still drift from actual behavior if not kept up to date |
| Swagger UI (`swagger-ui-express`) | Very common/familiar UI | Older/heavier UI compared to Scalar; same JSDoc drift risk |
| Hand-written OpenAPI YAML/JSON file | Single source of truth, no comment/code drift | Easy to forget updating when routes change; duplicated info vs inline JSDoc |
| No formal docs (README only) | Zero overhead | Harder for API consumers to discover routes/schemas |
