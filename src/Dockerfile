FROM node:22-trixie-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY spec ./spec

RUN npm test

ENV NODE_ENV=production
ENV SQLITE_DB_LOCATION=/data/todo.db

RUN mkdir -p /data

VOLUME ["/data"]
EXPOSE 3000

CMD ["npx", "nodemon", "src/index.js"]