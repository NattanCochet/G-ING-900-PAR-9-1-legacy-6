# 12. Front-end structure: static assets and EJS views under `front/`

## Status

Accepted

## Context

The application has a browser-facing layer alongside its API. It needs a clear
location for server-rendered pages and the CSS and JavaScript assets used by those
pages.

## Decision

Keep the browser-facing files under `src/front/` with two responsibilities:

- `views/` contains the EJS templates rendered by Express: `login.ejs`,
  `register.ejs`, and `home.ejs`.
- `static/` contains files served directly to the browser. Its current subfolders
  are `css/` for stylesheets and `js/` for browser-side JavaScript.

Express configures `src/front/views` as the EJS views directory and exposes
`src/front/static` through `express.static`, so assets are referenced from the web
root, such as `/css/theme.css` and `/js/dashboard.js`.

## Consequences

- Server-rendered templates and browser-served assets have separate, predictable
  locations.
- Routes can render views without knowing the internal front-end directory layout.
- Static assets can be added by type without mixing them with templates.
- The front-end remains part of the Node.js application and does not require a
  separate build or deployment pipeline.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **`front/static` and `front/views` (chosen)** | Matches Express conventions; keeps templates and assets separate; simple deployment | Requires explicit Express configuration |
| Single `front/` directory | Fewer directories | Mixes rendered templates with files served directly to browsers |
| Separate front-end application | Independent tooling and deployment; suitable for a larger client | Adds build, deployment, and integration complexity for the current server-rendered UI |