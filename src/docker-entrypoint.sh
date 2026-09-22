#!/bin/sh
# Runs as root: fixes ownership of the (possibly freshly mounted) data dir,
# since a runtime-mounted volume overrides any build-time chown, then drops
# privileges to the non-root `node` user before exec'ing the real command.
set -e

data_dir="$(dirname "${SQLITE_DB_LOCATION:-/data/todo.db}")"
mkdir -p "$data_dir"
chown -R node:node "$data_dir"

exec setpriv --reuid=node --regid=node --init-groups "$@"
