# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-trixie-slim

# ---- base: shared setup, no source yet (maximizes layer cache reuse) ----
FROM node:${NODE_VERSION} AS base
WORKDIR /app

# ---- deps: install all dependencies (incl. devDependencies, needed for dev/test) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: hot-reloading container used by docker-compose for local dev ----
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npx", "nodemon", "-L", "src/index.js"]

# ---- test: runs the suite against source + devDependencies, breaks the build on failure ----
FROM deps AS test
COPY . .
RUN npm test

# ---- prod-deps: production-only dependencies, pruned of dev tooling ----
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- prod: minimal runtime image, non-root, used for the deployed/Railway image ----
FROM base AS prod
# fail the build here if tests don't pass, without shipping devDependencies/spec in prod-deps
COPY --from=test /app/package.json /tmp/tested.marker
ENV NODE_ENV=production \
    SQLITE_DB_LOCATION=/data/todo.db
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

RUN mkdir -p /data && chown -R node:node /data /app
COPY src/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# stays root here: entrypoint chowns the runtime-mounted volume (which
# overrides this build-time chown) before dropping privileges to `node`
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/index.js"]