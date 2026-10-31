# Location History - Project Plan

## Overview

A privacy-first, battery-optimized personal tracking app. Fully self-hosted with no Google APIs, third-party analytics, or cloud vendor lock-ins. All data stays on your own server.

## Project Type

MOBILE + BACKEND + WEB DASHBOARD

## Success Criteria

- [x] Battery drain is < 3–5% per day during typical usage.
- [x] Background tracking survives app closure and device reboots.
- [x] Steps tracked via hardware `TYPE_STEP_COUNTER` sensor (no third-party app required).
- [x] Completely devoid of any Google APIs, third-party analytics, or cloud vendor lock-ins.
- [x] Fully self-hosted via Docker Compose with automated database backups.

## Tech Stack

### Mobile — `mobile-native/`

- **Language**: Kotlin 2.x
- **UI**: Jetpack Compose + Material 3
- **Maps**: osmdroid + Leaflet with standard OpenStreetMap tiles (no key; CARTO now watermarks keyless requests)
- **Location**: FusedLocationProviderClient (1 min interval, 15 m min distance)
- **Steps**: Android `TYPE_STEP_COUNTER` hardware sensor — no Health Connect, no third-party app
- **Storage**: Room (SQLite) + DataStore (Preferences)
- **Background**: Foreground `LocationService` + `WorkManager` for sync
- **Network**: Retrofit 2 + OkHttp

### Backend — `backend-dotnet/`

- **Language**: C# / .NET 10
- **Framework**: Minimal APIs
- **Database**: PostgreSQL + PostGIS via EF Core + Npgsql
- **Auth**: Single-user (`LocalUserProvider`) — personal self-hosted app
- **Endpoints**: `/api/tracking/*`, `/api/health/*`, `/api/ping`

### Web Dashboard — `web/`

- React + Vite + TypeScript
- Displays location timeline (map) and daily step counts
- Served via nginx, proxies `/api/` to the backend container

### Infrastructure — `deploy/`

- Docker Compose: `db` (PostGIS 15), `api` (port 3000), `web` (port 8090), `db-backup`
- Automated backups: 7 daily / 4 weekly / 6 monthly retention (`prodrigestivill/postgres-backup-local`)
- All services on isolated `atomik_net` bridge network

## Deprecated (do not modify)

- `/backend` — original Node.js / Fastify backend, replaced by `backend-dotnet/`

## File Structure

- `mobile-native/` — Android app (Kotlin + Compose)
- `backend-dotnet/` — .NET 10 API
- `web/` — React web dashboard
- `deploy/` — Docker Compose + nginx config + backup storage

## Key Architecture Notes

- **Step tracking**: `StepTracker` writes live count to DataStore (for real-time display). At midnight (day rollover), finalizes to Room. On Health screen open, today's DataStore count is persisted to Room before sync so today's steps are never missed.
- **Sync**: `LocationSyncWorker` (WorkManager) batches unsent location points. `HealthViewModel` batches all unsynced step rows — all previous days + today — in a single backend call.
- **Signing**: APKs are signed with `mobile-native/app/debug.keystore` (gitignored — keep a backup). Same `applicationId` and key as the original Expo build, so installs upgrade in place; `MIGRATION_0_1` in Room still upgrades a database created by that old app.
- **Cleartext HTTP**: `network_security_config.xml` globally permits cleartext so the server URL can be changed in-app without rebuilding the APK.

## Current Status

- Location tracking: ✅ Working (background, survives reboot)
- Step tracking: ✅ Working (hardware sensor, syncs to backend)
- Web dashboard: ✅ Steps + location timeline visible
- Docker deployment: ✅ Running on self-hosted Linux server
- Database backups: ✅ Automated
