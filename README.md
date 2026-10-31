# Atomik Activity

A privacy-first, battery-optimized, fully self-hosted location history app. No Google APIs,
no third-party analytics, no cloud lock-in: all data stays on your own server.

The Android app records location and steps in the background and syncs them to your backend.
A web dashboard visualises places, tracks and heatmaps on OpenStreetMap tiles.
See [`location-history.md`](location-history.md) for the full project plan.

## Repository layout

| Folder | Description |
| --- | --- |
| `mobile-native/` | Android app (Kotlin, Jetpack Compose, osmdroid), Gradle Kotlin DSL |
| `backend/` | Node.js / TypeScript API (Fastify, Drizzle ORM, PostgreSQL) |
| `backend-dotnet/` | .NET alternative backend (ASP.NET, EF Core, PostgreSQL) used by the self-hosted stack |
| `web/` | Web dashboard (Vite, React, Tailwind, Leaflet) |
| `deploy/` | Production-style Docker Compose stack with backup and restore scripts |
| `docs/` | Design and deployment plans |

## Quick start

### Local development database

```sh
docker compose up -d db
```

The root `docker-compose.yml` starts a PostGIS database for development only (it uses a
throwaway password; do not use it in production).

### Self-hosted deployment

```sh
cd deploy
cp .env.example .env   # set a strong POSTGRES_PASSWORD
docker compose up -d --build
```

See [`deploy/README.md`](deploy/README.md) for backups and restores.

### Node backend

```sh
cd backend
cp .env.example .env   # set DATABASE_URL and JWT_SECRET
npm ci
npm run dev
```

### .NET backend

```sh
cd backend-dotnet
dotnet run
```

### Web dashboard

```sh
cd web
npm ci
npm run dev
```

### Android app

```sh
cd mobile-native
./gradlew assembleDebug
```

The debug build points at `http://10.0.2.2:3000/api` (the host machine as seen from the Android
emulator). On a physical device, change the server URL from the Server Settings dialog on the
Home screen.

## License

[MIT](LICENSE)
