# atomik-activity — self-hosted deployment

This directory contains everything needed to run the full stack on a Linux server via Docker Compose:

| Service | Port | Description |
|---------|------|-------------|
| `db` | *internal only* | Postgres 15 + PostGIS — no host port (avoids conflicts) |
| `api` | `0.0.0.0:3000` | .NET 10 backend (C# API) |
| `web` | `0.0.0.0:8090` | Vite SPA behind nginx — `/api/*` proxied to `api:3000` |
| `db-backup` | *internal only* | Daily `pg_dump` with 7-day / 4-week / 6-month retention |

---

## Prerequisites

On the **target server**:
- Docker Engine + Docker Compose v2
- The repo checked out (or just this `deploy/` directory + `backend-dotnet/` + `web/`)

```bash
git clone <your-repo-url> atomik-activity
cd atomik-activity/deploy
```

---

## First-time setup

### 1 — Create `.env`

```bash
cp .env.example .env
nano .env          # set a strong POSTGRES_PASSWORD
```

### 2 — Build images

```bash
docker compose build
```

Takes ~2–3 min the first time (downloads SDK layers). Subsequent builds are fast due to layer caching.

### 3 — Start the stack

```bash
docker compose up -d
```

All four services start. Check health:

```bash
docker compose ps
```

### 4 — Smoke tests

```bash
# API alive
curl http://localhost:3000/api/ping
# → {"status":"ok"}

# Dashboard (open in browser)
http://<server-ip>:8090
```

---

## Migrating existing data from the dev machine

### Step 1 — Dump on Windows dev machine

Open PowerShell in the repo root:

```powershell
.\deploy\scripts\dump-from-dev.ps1
```

Produces `atomik-YYYYMMDD-HHmmss.dump` in the current directory.

> **Prerequisite:** Postgres 15 client tools on PATH.
> Install with `winget install PostgreSQL.PostgreSQL` or from https://postgresql.org/download/windows/

### Step 2 — Copy dump to the server

```powershell
scp atomik-20260525-141022.dump user@server:/path/to/atomik-activity/deploy/backups/
```

### Step 3 — Restore on the server

```bash
cd /path/to/atomik-activity/deploy
chmod +x scripts/restore-into-stack.sh
./scripts/restore-into-stack.sh backups/atomik-20260525-141022.dump
```

The script:
1. Starts `db`
2. Drops + recreates the database
3. Runs `pg_restore`
4. Prints row counts per table (compare with dev machine to verify)
5. Starts the full stack

---

## Daily automated backup

The `db-backup` service runs `pg_dump --format=plain.gz` every night via an internal cron. Backups land in `./backups/`:

```
deploy/backups/
├── daily/       # last 7 days
├── weekly/      # last 4 weeks
├── monthly/     # last 6 months
└── last/        # most recent (always up-to-date symlink)
```

### Ad-hoc backup (before risky operations)

```bash
chmod +x scripts/one-shot-backup.sh
./scripts/one-shot-backup.sh
```

### Restore from a daily snapshot

```bash
# From a .sql.gz snapshot
gunzip < backups/daily/location_history-2026-05-25-03-00-00.sql.gz \
    | docker compose exec -T db psql -U postgres -d location_history

# From a custom-format dump
./scripts/restore-into-stack.sh backups/atomik-20260525-141022.dump
```

### Off-box archival (recommended)

Add to the server's crontab to rsync backups to a NAS or remote storage:

```cron
0 4 * * * rsync -a /path/to/atomik-activity/deploy/backups/ user@nas:/backups/atomik/
```

---

## Reconfigure the mobile app

In the **atomik activity** native Android app, tap **Server Settings** on the Home screen and change the backend URL to:

```
http://<server-ip>:3000/api
```

After saving, the mobile app will sync new location and step data to the server. New data will appear in the web dashboard at `http://<server-ip>:8090`.

---

## Updating

```bash
git pull
docker compose build      # rebuilds changed services only
docker compose up -d      # rolling restart
```

## Stopping

```bash
docker compose down       # stop + remove containers (data in atomik_pgdata volume is safe)
docker compose down -v    # ⚠ also deletes the volume (ALL DATA LOST)
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `docker compose build` fails with "SDK 10.0 not found" | .NET 10 may still be preview on your registry. In `backend-dotnet/Dockerfile`, change `10.0` → `10.0-preview` on both FROM lines. |
| `api` health check keeps failing | `docker compose logs api` — the .NET app logs connection errors if `db` isn't ready. Usually self-resolves within 30 s. |
| `web` shows "API offline" | The API base URL is stored in browser localStorage. Open Settings in the dashboard and confirm it's set to `/api` (default) or the correct server URL. |
| Port 3000 conflict | `ss -tlnp | grep 3000`. If taken, edit `docker-compose.yml` and change `"3000:3000"` → `"3030:3000"`, then update the mobile Server Settings URL. |
| Backup files not appearing | `docker compose logs db-backup`. Check `POSTGRES_PASSWORD` in `.env` matches. Run `./scripts/one-shot-backup.sh` to test immediately. |
