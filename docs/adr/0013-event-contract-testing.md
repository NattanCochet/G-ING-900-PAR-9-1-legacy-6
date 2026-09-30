# 13. Contract testing: JSON Schema for the internal domain-event bus

## Status

Accepted

## Context

[ADR 0011](0011-domain-events-eventemitter.md) decoupled routes (producers) from
listeners (consumers, [src/events/listeners](../../src/events/listeners)) via an
in-process `EventEmitter`. Nothing enforced that the payload a route emits actually
matches what a listener expects (e.g.
[mailNotifier.js](../../src/events/listeners/mailNotifier.js) reads
`payload.email`) — a producer could rename/drop a field and only a listener crash
(or a silently dropped email) would reveal it, likely in production.

## Decision

Add [src/events/contracts.js](../../src/events/contracts.js): one JSON Schema
(validated with `ajv`) per event type, describing the exact payload shape routes
must emit. [spec/tests/eventsContract.spec.js](../../spec/tests/eventsContract.spec.js)
tests both sides against this shared contract:

- **Producer tests**: invoke each route handler (with mocked `db`) and validate the
  payload it actually emits on the real event bus against the schema.
- **Consumer tests**: feed each listener a contract-valid example payload (also
  defined in `contracts.js`) and assert it's handled without throwing.

`eventBus.emit` ([eventBus.js](../../src/events/eventBus.js)) also validates every
payload against its schema and `console.warn`s on a mismatch — non-fatal, so a
violation is visible in logs without breaking the request (consistent with the
"a listener must never crash the request" rule from ADR 0011).

## Consequences

- A route that changes an event's payload shape without updating `contracts.js`
  fails a fast, in-process unit test — no network calls, external broker, or
  running consumer service required (unlike a full Pact-style consumer-driven
  contract setup, which assumes real service-to-service HTTP boundaries).
- Listeners are tested against the contract's example payloads, not against
  whatever a producer test happens to send — so a listener regression is caught
  even if no producer test exercises that exact shape.
- Only covers the event-bus boundary. The HTTP API (routes) is documented but not
  contract-tested against its OpenAPI spec (see [ADR 0009](0009-api-documentation-openapi-scalar.md));
  and the two persistence adapters (`sqlite.js`/`mysql.js`) are not verified to
  implement the same interface (`mysql.js` currently only implements the task
  methods, not users/projects/columns) — both are candidates for follow-up
  contract tests, not covered by this change.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **JSON Schema (ajv) shared contract, tested in-process (chosen)** | No extra infra/broker; fast; catches producer/consumer drift at unit-test time | Only as good as the schemas being kept up to date; doesn't verify cross-process/cross-service contracts |
| Pact (consumer-driven contracts) | Industry-standard for real service-to-service/API contracts, contract broker, verifiable in CI per side | Overkill for an in-process `EventEmitter`; assumes independently deployable consumer/provider services, which this monolith doesn't have |
| No contract, rely on integration/e2e tests only | Simplest | Slower feedback; a payload mismatch is only caught if an e2e test happens to cover that exact path |
