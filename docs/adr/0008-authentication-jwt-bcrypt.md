# 8. Authentication: JWT + bcrypt password hashing

## Status

Accepted

## Context

The baseline app had no authentication — there was no security boundary protecting
routes or associating data with a user.

## Decision

Add `bcryptjs` for password hashing (`signup`/`login`) and `jsonwebtoken` for
stateless auth. [src/middleware/auth.js](../../src/middleware/auth.js) validates a
`Bearer` token and attaches `req.user`.

## Consequences

- Stateless: no server-side session store needed, scales horizontally without sticky
  sessions.
- `bcrypt` is the standard for password hashing.
- Token revocation is hard (no server-side session to invalidate).
- The signing secret defaults to `'changeme'` if `JWT_SECRET` isn't set — must be
  enforced/overridden in production.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **JWT + bcrypt (chosen)** | Stateless (no server-side session store needed); `bcrypt` is the standard for password hashing; scales horizontally without sticky sessions | Token revocation is hard (no server-side session to invalidate); secret defaults to `'changeme'` if `JWT_SECRET` isn't set — must be enforced in prod |
| Session cookies + server-side store | Easy revocation, simpler mental model | Needs a session store (Redis/DB), doesn't scale statelessly |
| OAuth / third-party identity provider | Offloads credential storage/security | Overkill for a small internal-style app; adds external dependency |
