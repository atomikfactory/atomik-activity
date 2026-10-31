#!/usr/bin/env bash
# Restore a custom-format pg_dump into the running (or fresh) stack.
#
# Usage:
#   cd /path/to/atomik-activity/deploy
#   ./scripts/restore-into-stack.sh backups/atomik-20260525-141022.dump
#
# The compose stack does not need to be up — this script starts db first,
# restores, then brings the rest up.

set -euo pipefail

DUMP="${1:?Usage: $0 <dump-file>}"

if [[ ! -f "$DUMP" ]]; then
    echo "ERROR: Dump file not found: $DUMP" >&2
    exit 1
fi

DUMP_ABS="$(realpath "$DUMP")"

# Load env so we use the same creds as the stack
if [[ -f .env ]]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' .env | xargs)
fi

PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-location_history}"

echo "==> Starting database service..."
docker compose up -d db
echo "==> Waiting for Postgres to be ready..."
until docker compose exec -T db pg_isready -U "$PG_USER" >/dev/null 2>&1; do
    sleep 2
done

echo "==> Dropping and recreating database: $PG_DB"
docker compose exec -T db psql -U "$PG_USER" -c "DROP DATABASE IF EXISTS $PG_DB;"
docker compose exec -T db psql -U "$PG_USER" -c "CREATE DATABASE $PG_DB;"

echo "==> Restoring from $DUMP ..."
docker compose exec -T db pg_restore \
    --username="$PG_USER" \
    --dbname="$PG_DB" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --exit-on-error \
    < "$DUMP_ABS"

echo ""
echo "==> Verifying row counts..."
docker compose exec -T db psql -U "$PG_USER" -d "$PG_DB" -c "
SELECT tablename, n_live_tup AS rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;"

echo ""
echo "==> Starting the full stack..."
docker compose up -d

echo ""
echo "Done. Smoke tests:"
echo "  curl http://localhost:3000/api/ping"
echo "  curl http://localhost:3000/api/tracking/dates"
echo "  Open http://<server-ip>:8090 in a browser"
