# 11. Domain events: `EventEmitter`-based event bus

## Status

Accepted

## Context

The baseline app had no eventing/pub-sub layer — route handlers did everything
inline, including any side effects.

## Decision

Add [src/events](../../src/events) — a process-wide `EventEmitter` singleton
([eventBus.js](../../src/events/eventBus.js)) with typed event names
([eventTypes.js](../../src/events/eventTypes.js)) and independent listeners
(starting with an audit logger,
[listeners/auditLogger.js](../../src/events/listeners/auditLogger.js)) registered in
[index.js](../../src/events/index.js).

## Consequences

- Zero extra infra (no message broker); listeners are decoupled from route logic —
  new consumers (websocket push, notifications) can plug in without touching routes.
- `emit` is wrapped so a throwing listener can't crash the request.
- Events are lost on process restart/crash (no persistence/retry); doesn't scale
  across multiple app instances (in-memory only).

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **In-process `EventEmitter` bus (chosen)** | Zero extra infra (no message broker); listeners decoupled from route logic — new consumers (websocket push, notifications) plug in without touching routes; `emit` is wrapped so a throwing listener can't crash the request | Events are lost on process restart/crash (no persistence/retry); doesn't scale across multiple app instances (in-memory only) |
| External message broker (RabbitMQ/Kafka/Redis pub-sub) | Durable, scales across instances | Major infra addition for a small app; unnecessary operational overhead here |
| Direct function calls (no event bus) | Simplest, explicit call graph | Side effects (e.g. audit logging) get tangled into route handlers, harder to extend without touching every route |
