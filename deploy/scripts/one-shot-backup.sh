#!/usr/bin/env bash
# Trigger an immediate backup outside the daily schedule.
# Useful before risky operations (schema migrations, restores, etc.).
#
# Usage:
#   cd /path/to/atomik-activity/deploy
#   ./scripts/one-shot-backup.sh

set -euo pipefail

echo "==> Triggering ad-hoc backup..."
docker compose run --rm db-backup /backup.sh

echo ""
echo "==> Latest backup files:"
ls -lhtr backups/last/ 2>/dev/null || echo "(no backups yet in backups/last/)"
echo ""
echo "Backup archive: deploy/backups/"
echo "To archive off-box: rsync -a backups/ user@nas:/path/to/atomik-backups/"
