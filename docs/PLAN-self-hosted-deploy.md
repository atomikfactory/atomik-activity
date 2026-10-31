# PLAN-self-hosted-deploy — Move stack to Docker on the target server

## Overview

Containerize and deploy the three server-side components — **Postgres** (with existing data preserved), **.NET API** (`backend-dotnet/`), and **web dashboard** (`web/`) — onto the target Linux server as a single `docker compose` stack. Add an automated daily backup of the Postgres database with multi-tier retention.

Coexists with the existing containers on the target server (honcho, immich, scratchy-scraper, etc.) without port conflicts. The mobile native app will point at the new server's IP via its in-app **Server Settings** dialog.

## Constraints from the target server

Observed from `docker ps`:

| Existing container | Port on host | What we must avoid |
|--------------------|--------------|---------------------|
| `honcho-database-1` (pgvector pg15) | `127.0.0.1:5432` | **Don't bind 5432 to the host.** Postgres stays on the internal Docker network only. |
| `honcho-api-1` | `127.0.0.1:8000` | Free for outsiders, but skip 8000. |
| `dozzle` | `0.0.0.0:8080` | Don't use 8080 for web. |
| `uptime-kuma` | `0.0.0.0:3001` | Don't use 3001. |
| `immich_server` | `0.0.0.0:2283` | Don't use 2283. |
| `web-ui-browser-use-webui-1` | `0.0.0.0:5901/6080/7788/9222` | Avoid those. |

Port plan for atomik:

| Service | Host port | Internal port | Visibility |
|---------|-----------|---------------|------------|
| Postgres (`db`) | *not exposed* | 5432 | Docker network only |
| .NET API (`api`) | `3000` (`0.0.0.0`) | 3000 | Reachable from mobile + LAN |
| Web (`web`, nginx) | `8090` (`0.0.0.0`) | 8080 | Browser access |
| Backup (`db-backup`) | *not exposed* | n/a | Writes to host bind mount |

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Postgres | `postgis/postgis:15-3.3` | Matches the existing dev compose; safe even if you keep the PostGIS columns. |
| .NET runtime | `mcr.microsoft.com/dotnet/aspnet:10.0` + `sdk:10.0` for build | Project targets `net10.0`. Multi-stage so the final image is ~210 MB. |
| Web build | `node:20-alpine` → static files served by `nginx:alpine` | Vite-compiled SPA; nginx also reverse-proxies `/api/*` → `api:3000` so the dashboard's default `/api` URL works without re-configuration. |
| Backup | `prodrigestivill/postgres-backup-local:15` | Mature, cron-scheduled `pg_dump` with daily/weekly/monthly retention. |
| Network | Single bridge `atomik_net` | Isolated from honcho/immich containers. |
| Volumes | Named `atomik_pgdata` + bind `./backups` | Backups visible on the host filesystem for off-box archival. |

## File Structure

```text
atomik-activity/
├── deploy/                              # NEW — everything to ship to the server
│   ├── docker-compose.yml
│   ├── .env.example                     # POSTGRES_PASSWORD etc.
│   ├── README.md                        # deployment + restore procedure
│   ├── backups/                         # bind-mounted; .gitkeep'd, contents gitignored
│   ├── nginx/
│   │   └── default.conf                 # SPA fallback + /api proxy to api:3000
│   └── scripts/
│       ├── dump-from-dev.ps1            # Windows-side: pg_dump current local DB
│       ├── restore-into-stack.sh        # Server-side: pg_restore the dump file
│       └── one-shot-backup.sh           # ad-hoc backup outside the schedule
├── backend-dotnet/
│   └── Dockerfile                       # NEW — multi-stage .NET build
└── web/
    └── Dockerfile                       # NEW — multi-stage Vite + nginx
```

Three new files in the existing project folders (the Dockerfiles), and the new `deploy/` directory containing everything that gets copied to the server.

---

## Task Breakdown

### T1 — `backend-dotnet/Dockerfile`

- **Priority:** P0
- **Dependencies:** none
- **OUTPUT:** Multi-stage Dockerfile:
  ```dockerfile
  FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
  WORKDIR /src
  COPY backend-dotnet.csproj .
  RUN dotnet restore
  COPY . .
  RUN dotnet publish -c Release -o /out --no-restore

  FROM mcr.microsoft.com/dotnet/aspnet:10.0
  WORKDIR /app
  COPY --from=build /out .
  ENV ASPNETCORE_URLS=http://0.0.0.0:3000
  EXPOSE 3000
  ENTRYPOINT ["dotnet", "backend-dotnet.dll"]
  ```
- **VERIFY:** `docker build -t atomik-api backend-dotnet/` succeeds; `docker run --rm -p 3000:3000 atomik-api` returns 200 from `/api/ping`.

---

### T2 — `web/Dockerfile` + `deploy/nginx/default.conf`

- **Priority:** P0
- **Dependencies:** none
- **OUTPUT:**
  - `web/Dockerfile`:
    ```dockerfile
    FROM node:20-alpine AS build
    WORKDIR /src
    COPY package.json package-lock.json ./
    RUN npm ci
    COPY . .
    RUN npm run build

    FROM nginx:alpine
    COPY --from=build /src/dist /usr/share/nginx/html
    COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
    EXPOSE 8080
    ```
  - `deploy/nginx/default.conf` — SPA + reverse proxy to the `api` service:
    ```nginx
    server {
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location /api/ {
            proxy_pass         http://api:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    ```
- **VERIFY:** Inside the running web container, `curl localhost:8080/api/ping` returns `{"status":"ok"}` (via the proxy to the backend). Browser on `http://server-ip:8090` renders the SPA.

---

### T3 — `deploy/docker-compose.yml`

- **Priority:** P0
- **Dependencies:** T1, T2
- **OUTPUT:** Compose file with four services on a private bridge network:

  ```yaml
  name: atomik

  networks:
    atomik_net:

  volumes:
    atomik_pgdata:

  services:
    db:
      image: postgis/postgis:15-3.3
      restart: unless-stopped
      environment:
        POSTGRES_USER:     ${POSTGRES_USER:-postgres}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
        POSTGRES_DB:       ${POSTGRES_DB:-location_history}
      volumes:
        - atomik_pgdata:/var/lib/postgresql/data
      networks: [atomik_net]
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-postgres}"]
        interval: 10s
        timeout: 3s
        retries: 10

    api:
      build:
        context: ../backend-dotnet
        dockerfile: Dockerfile
      restart: unless-stopped
      environment:
        ConnectionStrings__Postgres: "Host=db;Port=5432;Database=${POSTGRES_DB:-location_history};Username=${POSTGRES_USER:-postgres};Password=${POSTGRES_PASSWORD}"
      depends_on:
        db:
          condition: service_healthy
      ports:
        - "3000:3000"            # mobile + LAN access
      networks: [atomik_net]

    web:
      build:
        context: ../web
        dockerfile: Dockerfile
      restart: unless-stopped
      depends_on: [api]
      ports:
        - "8090:8080"            # browser access
      networks: [atomik_net]

    db-backup:
      image: prodrigestivill/postgres-backup-local:15
      restart: unless-stopped
      environment:
        POSTGRES_HOST:     db
        POSTGRES_DB:       ${POSTGRES_DB:-location_history}
        POSTGRES_USER:     ${POSTGRES_USER:-postgres}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
        SCHEDULE:          "@daily"
        BACKUP_KEEP_DAYS:  7
        BACKUP_KEEP_WEEKS: 4
        BACKUP_KEEP_MONTHS: 6
        BACKUP_DIR:        /backups
        HEALTHCHECK_PORT:  8080
      volumes:
        - ./backups:/backups
      depends_on:
        db:
          condition: service_healthy
      networks: [atomik_net]
  ```

- **VERIFY:** `docker compose up -d` brings up all four services in `healthy` state; `docker compose logs api` shows the .NET app listening on port 3000.

---

### T4 — `deploy/.env.example` + `deploy/README.md`

- **Priority:** P0
- **Dependencies:** T3
- **OUTPUT:**
  - `.env.example` — committed; user copies to `.env` and edits:
    ```env
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=change-me-strong-random-string
    POSTGRES_DB=location_history
    ```
  - `README.md` — step-by-step deploy:
    1. `git clone` repo on server, `cd deploy/`
    2. `cp .env.example .env` and fill in a strong password
    3. `docker compose build` (≈3 min for .NET, ≈1 min for web)
    4. `docker compose up -d`
    5. Smoke test: `curl http://localhost:3000/api/ping` and open `http://<server-ip>:8090`
    6. (Optional) Restore your existing data — see T6
- **VERIFY:** Following the README on a clean machine produces a working stack.

---

### T5 — Migration script: dump from Windows dev machine

- **Priority:** P0
- **Dependencies:** none
- **OUTPUT:** `deploy/scripts/dump-from-dev.ps1`:
  ```powershell
  # Runs on the Windows dev machine where the current Postgres is hosted.
  # Produces a custom-format dump that pg_restore on the server consumes.
  $ErrorActionPreference = "Stop"
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $outFile = "atomik-$stamp.dump"
  & pg_dump `
      --host=localhost --port=5432 `
      --username=postgres `
      --dbname=location_history `
      --format=custom --no-owner --no-privileges `
      --file=$outFile
  Write-Host "Wrote $outFile ($((Get-Item $outFile).Length / 1MB).ToString('F1')) MB)"
  Write-Host "Next: scp $outFile <user>@<server>:/path/to/atomik-activity/deploy/backups/"
  ```
- **VERIFY:** Run on dev → produces `atomik-YYYYMMDD-HHMMSS.dump` (≥ 1 KB, typically a few MB).

> **Prerequisite:** Postgres 15+ client tools installed on Windows (`winget install PostgreSQL.PostgreSQL` or download from postgresql.org). `pg_dump` must be on PATH.

---

### T6 — Restore script: pg_restore on the target

- **Priority:** P0
- **Dependencies:** T3, T5
- **OUTPUT:** `deploy/scripts/restore-into-stack.sh`:
  ```bash
  #!/usr/bin/env bash
  # Usage: ./restore-into-stack.sh <dump-file>
  set -euo pipefail
  DUMP="${1:?Usage: $0 <dump-file>}"

  if [[ ! -f "$DUMP" ]]; then
      echo "Dump file not found: $DUMP" >&2
      exit 1
  fi

  # The compose stack must be up — but the API will fail until the schema exists,
  # which is fine because pg_restore creates it.
  docker compose up -d db
  docker compose exec -T db pg_isready -U postgres >/dev/null

  echo "Dropping existing data in location_history..."
  docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS location_history;"
  docker compose exec -T db psql -U postgres -c "CREATE DATABASE location_history;"

  echo "Restoring from $DUMP..."
  docker compose exec -T db pg_restore \
      --username=postgres --dbname=location_history \
      --no-owner --no-privileges --clean --if-exists \
      < "$DUMP"

  echo "Done. Bringing the rest of the stack up..."
  docker compose up -d
  ```
- **VERIFY:**
  - Run `./restore-into-stack.sh /path/to/atomik-YYYYMMDD.dump` on the server.
  - `docker compose exec db psql -U postgres location_history -c "SELECT COUNT(*) FROM points;"` returns the same row count as the dev machine.
  - `curl http://localhost:3000/api/tracking/dates` returns the same list of dates that the dev backend served.

---

### T7 — Verify backup schedule + ad-hoc backup

- **Priority:** P1
- **Dependencies:** T3
- **OUTPUT:**
  - The `db-backup` service writes to `./backups/daily|weekly|monthly/` automatically once per day after midnight UTC.
  - `deploy/scripts/one-shot-backup.sh` — trigger a backup outside the schedule:
    ```bash
    #!/usr/bin/env bash
    set -euo pipefail
    docker compose exec db-backup /backup.sh
    ls -lh backups/last/
    ```
- **VERIFY:**
  - 24 hours after `up -d`, `ls backups/daily/` shows a `.sql.gz` file (~1–5 MB compressed).
  - Run `one-shot-backup.sh` immediately to confirm a `backups/last/*.sql.gz` is produced.
  - Off-box archival recommendation: rsync `backups/` to a NAS or cloud bucket via a separate cron job — out of scope for this plan but a one-liner.

---

### T8 — Reconfigure the mobile app

- **Priority:** P0
- **Dependencies:** T3 running
- **OUTPUT:** No code change required — the user's `mobile-native` app has a **Server Settings** dialog on the Home screen. Tap it, replace the default `http://10.0.2.2:3000/api` with `http://<server-lan-or-public-ip>:3000/api`, hit Save.
- **VERIFY:** After the next sync cycle (≤15 min), the dashboard at `http://<server-ip>:8090` shows new points from the phone.

> **If the mobile app is on a different network from the server**, expose port 3000 through your router or use a VPN / Tailscale (out of scope here). Don't expose Postgres directly — only `:3000` (.NET API) and `:8090` (web).

---

### T9 — Optional: reverse proxy / HTTPS

- **Priority:** P3
- **Dependencies:** T3
- **OUTPUT:** Not included in this plan because the existing target-server containers are all on raw HTTP ports too. If/when the user wants HTTPS, the natural fit is **Caddy** in front (auto-TLS via Let's Encrypt), reverse-proxying `atomik.<domain>` → `web:8080` and `atomik-api.<domain>` → `api:3000`. Drop-in 20-line `Caddyfile`. Not in scope here.

---

## Backup & restore procedure (the one you'll actually run)

**Automated daily backup** — `db-backup` writes to `deploy/backups/daily/<date>.sql.gz`. Retention: 7 daily, 4 weekly, 6 monthly. The host bind-mount means `tar czf backups-archive.tgz deploy/backups/` copies all of them off the server.

**Ad-hoc backup** — `./scripts/one-shot-backup.sh` whenever you want an extra snapshot before a risky operation.

**Restore from a daily snapshot**:
```bash
gunzip < deploy/backups/daily/location_history-2026-05-25-03-00-00.sql.gz \
    | docker compose exec -T db psql -U postgres -d location_history
```

**Restore from a custom-format dump** (the kind T5 produces):
```bash
./scripts/restore-into-stack.sh deploy/backups/atomik-20260525-141022.dump
```

---

## Risks & Rollback

| Risk | Mitigation | Rollback |
|------|-----------|----------|
| .NET 10 image lag | If `mcr.microsoft.com/dotnet/aspnet:10.0` isn't tagged on the server's day, pin to `10.0-preview` or fall back to `9.0` after retargeting the csproj. | Keep the dev machine running until the new server stack is verified end-to-end. |
| Schema differences | Existing dev DB may have PostGIS-typed columns the .NET EF model doesn't fully understand. Use `pg_restore --no-owner --no-privileges` and don't drop the postgis extension. | Take a final dev-side backup before migrating; keep the dev DB around for 30 days. |
| Port 3000 already taken on the host | None of the listed running containers use 3000 — verify with `ss -tlnp` before `up -d`. If taken, change the host-side mapping (`"3000:3000"` → `"3030:3000"`) and update the mobile **Server Settings** URL accordingly. | Stop the conflicting container or pick another port. |
| `db-backup` retention deletes a backup before you noticed it | Set `BACKUP_KEEP_DAYS=14` instead of 7 for more headroom. | Off-box rsync to a separate machine. |
| Disk fills up | The bind mount is on the host; monitor with `df -h`. | Reduce retention or move `./backups` to a larger volume. |

---

## Non-Goals (v1)

- HTTPS / public domain / reverse proxy (T9 is future work).
- Multi-user auth on the .NET backend — it remains single-user (`LocalUserProvider`).
- Off-box backup replication (rsync/S3 is a separate cron line).
- Mobile-app auto-discovery of the server IP — the **Server Settings** dialog stays as the manual switch.

---

## Phase X — Verification Checklist

- [ ] `docker compose build` succeeds locally on the Windows dev box (proves Dockerfiles are valid before shipping).
- [ ] Repo SCP'd to server; `.env` created with a strong password.
- [ ] `docker compose up -d` on server brings four containers to `healthy`.
- [ ] `curl http://<server-ip>:3000/api/ping` → `{"status":"ok"}`.
- [ ] `curl http://<server-ip>:8090/` returns HTML (the SPA shell).
- [ ] `pg_dump` ran on dev, dump file copied to server.
- [ ] `restore-into-stack.sh` ran successfully; `points` table row count matches dev.
- [ ] Web dashboard at `http://<server-ip>:8090` shows the same dates / map / step counts as it did locally.
- [ ] Mobile **Server Settings** updated; next sync push produces new rows visible in the web dashboard.
- [ ] After 24 hours, `deploy/backups/daily/` contains a `.sql.gz`.
- [ ] None of the existing target-server containers report `Restarting` or any new errors in `docker ps`.

---

## Estimated effort

~3–4 hours end-to-end:
- 30 min: Dockerfiles + nginx config (T1, T2)
- 30 min: compose + env + README (T3, T4)
- 30 min: dump on dev + scp to server (T5)
- 30 min: restore + smoke test (T6, T8)
- 30 min: verify backup schedule + ad-hoc backup (T7)
- 30 min buffer for the inevitable port/permission detail
