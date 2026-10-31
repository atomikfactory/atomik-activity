# PLAN-native-android — Pure-Native Android Rewrite

## Overview

Rewrite the mobile app from Expo/React Native to **pure native Android (Kotlin + Jetpack Compose)** in a new sibling folder `mobile-native/`. Same package ID, same signing key, same SQLite file → the new APK installs as an **update** over the existing Expo build with zero data loss for buffered location points. Talks to the C# .NET backend only (no JWT, single-user mode). Privacy-first defaults, battery-optimized location strategy. Goal: `gradlew assembleDebug` → APK → manual transfer to the Pixel.

## Project Type

**MOBILE — Native Android only.** Kotlin 2.x, Jetpack Compose, Material 3, min SDK 26, target SDK 36. No Expo, no React Native, no Hermes, no Metro. New folder `mobile-native/` sibling to `mobile/` (the Expo app stays in place as a reference until parity is verified).

## Success Criteria

- [ ] `cd mobile-native && gradlew assembleDebug` produces `app-debug.apk` ≤ ~10 MB.
- [ ] APK installs **on top** of the existing Expo build with `adb install -r` (or sideload after copying) — Android accepts the update because the package ID and signing key match.
- [ ] After install: existing `location_buffer` rows in `location-offline.db` are still readable and queued for sync (zero loss).
- [ ] Background location tracking restarts under the new foreground service automatically (user re-grants permissions if Android revoked them; otherwise transparent).
- [ ] Timeline screen renders past + today's polyline from the same `/api/tracking/daily` endpoint with no SF flash; same date-arrow header + calendar-modal upgrade from PLAN-map-fix.
- [ ] Health Connect screen reads steps + sleep, syncs via the C# backend's `/api/health/batch`. Health Connect permissions survive the install (managed by HC, not the app).
- [ ] No login screen, no auth token — single-user only (C# backend's `LocalUserProvider` mode).
- [ ] Privacy invariants hold (see "Privacy posture" below).
- [ ] Battery posture: idle-day tracking uses < 3 % of battery per 24 h on Pixel.

## Tech Stack

| Area | Choice | Rationale |
| ---- | ------ | --------- |
| Language | **Kotlin 2.x** | Standard for modern Android. |
| UI | **Jetpack Compose + Material 3** | Google's recommended modern UI stack. Less boilerplate than XML+Views. |
| Architecture | **MVVM + StateFlow + Compose state** | Idiomatic for Compose; no extra DI framework needed for an app this size. Manual DI via Application class. |
| DB | **Room (over the existing SQLite file)** | Kotlin-friendly, type-safe DAO, but opened against the existing `location-offline.db` with identical schema so existing data survives. |
| Background work | **Foreground Service + WorkManager** | Foreground service for live location (Android 10+ requirement); WorkManager handles periodic sync with battery/network constraints. |
| Location | **FusedLocationProviderClient** + **ActivityRecognitionClient** | Battery-friendly fused provider; activity recognition pauses tracking when stationary. |
| Maps | **osmdroid** | OSS, no API key, CartoDB Voyager tiles preserve current look. |
| Health | **`androidx.health.connect:connect-client`** directly | Native Android library — no RN binding indirection. |
| Networking | **Retrofit + OkHttp + kotlinx.serialization** | Standard, lightweight, easy logging interceptor for dev. |
| Async | **Kotlin coroutines + Flow** | Native; no RxJava. |
| Date/time | **java.time** (`LocalDate`, `Instant`) | API 26+ guaranteed; no library. |
| Prefs | **DataStore (Preferences)** | Modern replacement for SharedPreferences. |
| Calendar picker | **Material 3 `DatePicker`** + bottom sheet | Built-in, dark-theme-ready. |

**No analytics SDK, no Firebase, no crash reporting service, no Google Play Services other than location.** Privacy-first.

## File Structure

```text
mobile-native/
├── build.gradle.kts                      # root: AGP + Kotlin plugin versions
├── settings.gradle.kts                   # include :app
├── gradle.properties                     # JVM args, AndroidX flags
├── gradle/wrapper/                       # Gradle wrapper (8.x)
├── gradlew + gradlew.bat
└── app/
    ├── build.gradle.kts                  # AGP module config
    ├── proguard-rules.pro
    ├── debug.keystore                    # COPIED from mobile/android/app/ — same key = update install
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/
        │   ├── values/
        │   │   ├── strings.xml
        │   │   ├── colors.xml
        │   │   └── themes.xml
        │   ├── drawable/
        │   ├── mipmap-*/                 # adaptive icon — reuse mobile/assets/adaptive-icon.png
        │   └── xml/
        │       └── network_security_config.xml   # allow cleartext to dev backend IP only
        └── kotlin/com/atomik/activity/
            ├── AtomikApp.kt              # Application class — manual DI graph
            ├── MainActivity.kt           # Hosts Compose NavHost
            ├── data/
            │   ├── db/
            │   │   ├── AppDatabase.kt           # Room DB, name = "location-offline.db"
            │   │   ├── entities/
            │   │   │   ├── LocationBufferEntity.kt
            │   │   │   ├── HealthStepsDailyEntity.kt
            │   │   │   └── HealthSleepSessionEntity.kt
            │   │   └── dao/
            │   │       ├── LocationDao.kt
            │   │       └── HealthDao.kt
            │   ├── network/
            │   │   ├── ApiClient.kt             # Retrofit factory
            │   │   ├── TrackingApi.kt           # POST /api/tracking/batch, GET /daily, /range, /dates
            │   │   ├── HealthApi.kt             # POST /api/health/batch, GET /daily
            │   │   └── dto/                     # request/response models
            │   ├── prefs/
            │   │   └── AppPreferences.kt        # DataStore — backend URL, lastSyncTs, hcBackfillDone
            │   └── repo/
            │       ├── LocationRepository.kt
            │       └── HealthRepository.kt
            ├── location/
            │   ├── LocationService.kt           # Foreground service
            │   ├── LocationManager.kt           # Wraps Fused + ActivityRecognition
            │   ├── LocationSyncWorker.kt        # WorkManager
            │   └── BootReceiver.kt              # Re-arm service after reboot if user was tracking
            ├── health/
            │   ├── HealthConnectGateway.kt
            │   └── HealthSyncWorker.kt
            ├── ui/
            │   ├── theme/
            │   │   ├── Color.kt                 # #121212, #007BFF, #00cc66 — same as Expo app
            │   │   ├── Theme.kt
            │   │   └── Type.kt
            │   ├── nav/AppNavHost.kt
            │   ├── home/
            │   │   ├── HomeScreen.kt
            │   │   └── HomeViewModel.kt
            │   ├── timeline/
            │   │   ├── TimelineMap.kt           # osmdroid MapView inside Compose
            │   │   ├── TimelineHeader.kt        # Arrows + tappable label
            │   │   └── CalendarSheet.kt         # Material3 bottom-sheet date picker
            │   ├── health/
            │   │   ├── HealthScreen.kt
            │   │   ├── HealthViewModel.kt
            │   │   ├── StepsCard.kt
            │   │   └── SleepCard.kt
            │   └── permissions/
            │       └── PermissionGate.kt
            └── util/
                ├── DateUtils.kt
                └── Logging.kt
```

---

## Task Breakdown

### T1 — Bootstrap Gradle project

- **Skill:** `clean-code`
- **Priority:** P0
- **Dependencies:** none
- **INPUT:** none
- **OUTPUT:**
  - `mobile-native/` folder, AGP 8.x, Kotlin 2.x, Compose BOM 2024.x.
  - `applicationId = "com.atomik.activity"` (must match — retro-compat invariant).
  - `versionCode` set higher than existing app's `1` (e.g. `2`) so Android sees it as an update.
  - `versionName = "2.0.0"` or `"1.1.0"` — bumped major to signal rewrite.
  - `minSdk = 26`, `targetSdk = 36`, `compileSdk = 36`.
  - `signingConfigs.debug` pointed at `app/debug.keystore` **copied from `mobile/android/app/debug.keystore`** — critical for update-install.
  - Java 17 toolchain.
- **VERIFY:** `gradlew tasks` lists `assembleDebug`; `gradlew help` exits 0.

---

### T2 — Compose theme + nav skeleton

- **Skill:** `app-builder`
- **Priority:** P0
- **Dependencies:** T1
- **INPUT:** colour palette from current Expo app (`#121212` bg, `#007BFF` accent, `#00cc66` tracking dot)
- **OUTPUT:**
  - `AtomikApp` Application class, `MainActivity` with `setContent { AtomikTheme { AppNavHost() } }`.
  - Material 3 dark theme matching the existing dark palette.
  - `AppNavHost` with two destinations: `home`, `health`. No login route.
- **VERIFY:** Build runs, empty Home screen renders dark `#121212` background.

---

### T3 — Room DB on existing SQLite file (retro-compat)

- **Skill:** `clean-code`
- **Priority:** P0 (data-loss risk if wrong)
- **Dependencies:** T1
- **INPUT:** Existing schema from [mobile/src/utils/offlineBuffer.ts](mobile/src/utils/offlineBuffer.ts).
- **OUTPUT:**
  - `AppDatabase` built with `Room.databaseBuilder(ctx, AppDatabase::class.java, "location-offline.db")` — **exact same file name**.
  - Entities mirror the existing column names + types **exactly**:
    - `location_buffer (id INTEGER PK AUTOINCREMENT, latitude REAL, longitude REAL, accuracy REAL?, altitude REAL?, speed REAL?, heading REAL?, timestamp INTEGER)` → `LocationBufferEntity`.
    - `health_steps_daily (id INTEGER PK AUTOINCREMENT, date TEXT, steps INTEGER, source TEXT?, synced INTEGER DEFAULT 0)` → `HealthStepsDailyEntity`.
    - `health_sleep_sessions (id INTEGER PK AUTOINCREMENT, external_id TEXT, start_time TEXT, end_time TEXT, duration_min INTEGER, stages_json TEXT?, source TEXT?, synced INTEGER DEFAULT 0)` → `HealthSleepSessionEntity`.
  - `addMigrations(MIGRATION_0_1, MIGRATION_1_X)` — handle the case where the DB was created with `user_version = 0` (Expo app's first state) or `1` (after PLAN-health-tracking ran).
  - Skip Room's destructive migration; if Room's schema validation rejects the existing DB (unlikely with identical columns), fall back to `.openHelperFactory(SupportSQLiteOpenHelper)` and use raw queries instead of Room — DAOs would map manually. Decide in T3.5.
- **VERIFY:**
  - On a device that previously ran the Expo app: install the new APK, query `location_buffer` count via a diagnostic screen — count matches what was in the old app.
  - Insert via Room and read back via raw SQL — confirms columns line up.

---

### T3.5 — Decision gate: Room vs raw SQLite

- **Skill:** `clean-code`
- **Priority:** P0
- **Dependencies:** T3 (initial attempt)
- **OUTPUT:** If Room's schema-version handshake fights the existing DB, switch DAOs to raw `SupportSQLiteOpenHelper` + manual queries. Document the choice in code comments.
- **VERIFY:** Existing rows survive a write+read round-trip.

---

### T4 — Retrofit client + DTOs

- **Skill:** `clean-code`
- **Priority:** P0
- **Dependencies:** T2
- **INPUT:** [backend-dotnet/Endpoints/TrackingEndpoints.cs](backend-dotnet/Endpoints/TrackingEndpoints.cs), [backend-dotnet/Endpoints/HealthDataEndpoints.cs](backend-dotnet/Endpoints/HealthDataEndpoints.cs), [backend-dotnet/Data/points.json](backend-dotnet/Data/points.json) for the sync wire format.
- **OUTPUT:**
  - `ApiClient` factory exposing `TrackingApi` + `HealthApi`.
  - `TrackingApi.batch(items: List<BatchItem>)`, body shape:
    ```kotlin
    data class BatchItem(
      val latitude: Double, val longitude: Double,
      val accuracy: Double?, val altitude: Double?,
      val speed: Double?, val heading: Double?,
      val timestamp: Long // unix-ms — what the C# backend expects
    )
    data class BatchRequest(val items: List<BatchItem>)
    ```
  - `TrackingApi.daily(date: String): DailyResponse`
  - `HealthApi.batch(body: HealthBatchRequest)`, `HealthApi.daily(date)`.
  - Base URL from `AppPreferences` (default `http://10.0.2.2:3000/api`, the Android emulator host loopback; on a physical device set `http://<server-lan-ip>:3000/api` from the Server Settings dialog).
  - OkHttp `HttpLoggingInterceptor` in debug, off in release.
- **VERIFY:** A round-trip `curl` payload from `mobile-native` device against the C# backend produces the same effect as the old Expo app (rows appear in DB).

---

### T5 — LocationService (foreground service)

- **Skill:** `app-builder`
- **Priority:** P0
- **Dependencies:** T3, T4
- **INPUT:** Battery posture spec below.
- **OUTPUT:**
  - `LocationService : Service` with `START_STICKY`, `ServiceCompat.startForeground(this, NOTIF_ID, notif, FOREGROUND_SERVICE_TYPE_LOCATION)`.
  - Persistent low-priority notification: title "atomik activity", text "Tracking active" (no progress bar, no sounds).
  - `FusedLocationProviderClient` request:
    ```
    LocationRequest.Builder(PRIORITY_BALANCED_POWER_ACCURACY, 5 * 60 * 1000L)
      .setMinUpdateDistanceMeters(50f)
      .setWaitForAccurateLocation(false)
      .setMaxUpdateDelayMillis(15 * 60 * 1000L)   // batched
      .build()
    ```
  - `ActivityRecognitionClient` subscription — when transition = STILL for > 5 min, pause location requests until next IN_VEHICLE / ON_FOOT.
  - Each callback → insert into `location_buffer` via `LocationDao`.
  - Threshold trigger: after every 10 buffered points OR every 5 min, kick `LocationSyncWorker` immediately.
- **VERIFY:**
  - Walking around with the screen off → points accumulate; battery delta < 3 % over a 24 h idle day.
  - Killing the app from recents — service survives (foreground).
  - Reboot: BootReceiver fires `ACTION_BOOT_COMPLETED`, restarts service if user previously enabled tracking.

---

### T6 — LocationSyncWorker

- **Skill:** `clean-code`
- **Priority:** P0
- **Dependencies:** T5
- **INPUT:** `LocationDao`, `TrackingApi`.
- **OUTPUT:**
  - WorkManager `CoroutineWorker`, run constraints: `NetworkType.CONNECTED`, `requiresBatteryNotLow = true`.
  - Reads `location_buffer` rows, posts to `/api/tracking/batch`, deletes rows on 200.
  - Backoff: exponential, 30 s → 5 min cap, max 5 retries.
  - Scheduled periodic 15 min (`PeriodicWorkRequestBuilder<>(15, MINUTES)`).
  - Also enqueued one-shot by `LocationService` when batch threshold hit.
- **VERIFY:** Airplane-mode walk for an hour → rows accumulate in `location_buffer` with no error; come back online → next sync cycle clears them.

---

### T7 — Permissions flow

- **Skill:** `app-builder`
- **Priority:** P0
- **Dependencies:** T5
- **INPUT:** Android 14+ runtime permission rules.
- **OUTPUT:**
  - `PermissionGate` composable wrapping HomeScreen. On first launch, requests in order:
    1. `POST_NOTIFICATIONS` (Android 13+)
    2. `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`
    3. `ACCESS_BACKGROUND_LOCATION` (separate dialog on Android 10+)
    4. `ACTIVITY_RECOGNITION` (Android 10+)
  - Rationale dialogs before each step, with a Settings deep-link if user denies twice.
  - Health Connect permissions live in `HealthScreen` (granted on-demand, see T10).
- **VERIFY:** Cold install → walks the user through the dialogs in order; revoking any from Settings → app shows a "Permission needed" state, not a crash.

---

### T8 — TimelineMap (osmdroid in Compose)

- **Skill:** `app-builder`
- **Priority:** P1
- **Dependencies:** T4
- **INPUT:** [mobile/src/components/TimelineMap.tsx](mobile/src/components/TimelineMap.tsx) as the reference behaviour.
- **OUTPUT:**
  - `osmdroid` `MapView` inside `AndroidView`. Tile source: `XYTileSource("CartoVoyager", 0, 19, 256, ".png", arrayOf("https://a.basemaps.cartocdn.com/rastertiles/voyager/"))`.
  - `Polyline` overlay coloured `#007BFF`, green start marker, red end marker.
  - Region resolution mirrors the Expo fix: parallel-fetch user location + points on first load (`Promise.all`-equivalent with `async + await`), then `controller.animateTo(...)` on date changes. No SF flash.
  - `setUserAgentValue(packageName)` — osmdroid requires this for tile servers.
- **VERIFY:** Today's polyline matches what `/api/tracking/daily` returns for the same date in the Expo app.

---

### T9 — Timeline header + calendar sheet

- **Skill:** `app-builder`
- **Priority:** P1
- **Dependencies:** T2
- **INPUT:** [mobile/src/components/TimelineHeader.tsx](mobile/src/components/TimelineHeader.tsx) + [mobile/src/components/CalendarSheet.tsx](mobile/src/components/CalendarSheet.tsx) as references.
- **OUTPUT:**
  - Compose row: `‹` `IconButton`, tappable date `Text`, `›` `IconButton` (disabled when on today).
  - Tapping the date opens a `ModalBottomSheet` containing Material 3 `DatePicker` with `selectableDates` blocking future dates.
- **VERIFY:** Pixel device — arrows shift by ±1 day, sheet opens with the calendar centered on the selected date, future days non-tappable.

---

### T10 — Health Connect gateway

- **Skill:** `clean-code`
- **Priority:** P1
- **Dependencies:** T4, T7
- **INPUT:** [mobile/src/utils/healthConnect.ts](mobile/src/utils/healthConnect.ts) reference.
- **OUTPUT:**
  - `HealthConnectGateway` wrapping `HealthConnectClient.getOrCreate(ctx)`.
  - Reads `StepsRecord.aggregate(...)` for a date range and `SleepSessionRecord.read(...)`.
  - Permission set: `HealthPermission.getReadPermission(StepsRecord::class) + HealthPermission.getReadPermission(SleepSessionRecord::class)`.
  - Same backfill behaviour as the Expo app: on first permission grant, pull 30 days of history; subsequent foreground resumes pull today only.
- **VERIFY:** Step count matches the Health Connect app within 1–2 min of staleness; sleep session shows up with stages if the source provided them.

---

### T11 — HealthSyncWorker + HealthScreen UI

- **Skill:** `app-builder`
- **Priority:** P1
- **Dependencies:** T6, T10
- **OUTPUT:**
  - WorkManager job same shape as `LocationSyncWorker` but for health data. Posts to `/api/health/batch`.
  - `HealthScreen` with `StepsCard` + `SleepCard` matching the Expo UI; `TimelineHeader` + `CalendarSheet` shared from T9.
- **VERIFY:** Manual round-trip: read steps → buffer → sync → confirm row in Postgres via psql.

---

### T12 — Boot receiver + tracking-state persistence

- **Skill:** `clean-code`
- **Priority:** P2
- **Dependencies:** T5
- **OUTPUT:**
  - `BootReceiver` listening to `ACTION_BOOT_COMPLETED`. If `AppPreferences.trackingEnabled == true`, start `LocationService`.
  - `AppPreferences.trackingEnabled` defaults to `true` on first launch (mirrors existing auto-start behaviour) and is toggled by the Home screen button.
- **VERIFY:** Toggle tracking on, reboot device, after unlock confirm the foreground notification is back.

---

### T13 — Migration shim for the old Expo tracking task

- **Skill:** `clean-code`
- **Priority:** P0
- **Dependencies:** T5
- **OUTPUT:**
  - On first launch detecting an upgrade from the Expo app (heuristic: `location_buffer` table exists AND `BuildConfig.VERSION_CODE > 1`), best-effort:
    - Call `WorkManager.cancelUniqueWork("expo-task-name")` for any IDs Expo might have registered (best-effort, ignore errors).
    - Push any unsynced `location_buffer` rows immediately via `LocationSyncWorker` one-shot (matches the "safety push" in [mobile/App.tsx](mobile/App.tsx)).
    - Start `LocationService` (auto-restart of tracking under the new code).
- **VERIFY:** Install over the Expo app, walk for 5 min, observe both old buffered points and new ones land on the C# backend.

---

### T14 — Manifest + privacy posture

- **Skill:** `clean-code`
- **Priority:** P0
- **Dependencies:** T5, T7, T10
- **OUTPUT:**
  - Permissions: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACTIVITY_RECOGNITION`, `INTERNET`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `android.permission.health.READ_STEPS`, `android.permission.health.READ_SLEEP_SESSION`.
  - `<queries>` block for Health Connect (same as PLAN-health-tracking).
  - `<activity-alias>` for Health Connect's "Connected Apps" screen.
  - `android:usesCleartextTraffic="false"` in `<application>`; `network_security_config.xml` whitelists only the dev LAN IP for HTTP (debug build).
  - `android:allowBackup="false"` — privacy posture (no auto-backup of SQLite to Google Drive).
  - `tools:remove="android:fullBackupContent"` to strip any Expo-era backup config.
- **VERIFY:** `aapt dump permissions app-debug.apk` shows the exact list; no extra Google Play perms; no analytics.

---

### T15 — APK build + install procedure

- **Skill:** `clean-code`
- **Priority:** P0
- **Dependencies:** T1–T14
- **OUTPUT:**
  - `cd mobile-native && gradlew assembleDebug` produces `app/build/outputs/apk/debug/app-debug.apk`.
  - README in `mobile-native/` with the install steps:
    1. Copy `app-debug.apk` to phone via USB / Drive.
    2. On the phone: tap to install (allow "install from unknown sources" if prompted).
    3. Because package + signing key match, Android offers "Update" not "Install new" — confirm Update.
- **VERIFY:** Side-by-side compare: open the new app, confirm previous days still show in the Timeline; foreground notification appears; new walk syncs to C# backend.

---

## Privacy posture (concrete rules)

- **No third-party SDKs** beyond AndroidX, osmdroid, Retrofit, and Google Play Services (location + activity recognition only — these run on-device).
- **No analytics.** No Firebase Analytics, no Crashlytics, no Mixpanel.
- **No external storage.** All data in app sandbox (`/data/data/com.atomik.activity/`).
- **`android:allowBackup="false"`** — no automatic Google Drive backup of SQLite.
- **Network whitelist:** the only outbound HTTP is to `AppPreferences.backendUrl`. Verified by code review (single `OkHttpClient` instance).
- **Cleartext traffic** allowed only in debug builds via `network_security_config.xml`. Release builds force HTTPS.
- **Logs scrub coordinates** — `Logging.kt` truncates lat/lng to two decimals (~1 km precision) when logging in debug; never logs at all in release.
- **Permission rationale** before each request — no silent grabs.
- **Auto-delete buffered points after successful sync** (already the behaviour; explicit in `LocationSyncWorker`).
- **Open code:** the app source is in this repo — auditable.

---

## Battery posture (concrete rules)

| Lever | Setting |
|-------|---------|
| Location priority | `PRIORITY_BALANCED_POWER_ACCURACY` |
| Update interval | 5 min nominal, batched up to 15 min |
| Min distance | 50 m before a new fix is reported |
| Activity recognition | Pause location subscription when `STILL` for > 5 min |
| Sync frequency | WorkManager 15 min minimum, `requiresBatteryNotLow = true` |
| Wake locks | None held — fused provider + WorkManager handle wakeups |
| Foreground service notif | Low importance channel, no vibration, no sound |
| Doze whitelist | **Do NOT** request `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` — the app cooperates with Doze, doesn't fight it |

Expected idle-day draw on a Pixel 8: < 3 % battery / 24 h. Active-day (continuous walking): 8–12 %.

---

## Retro-compatibility plan (data carry-over)

Five frozen invariants the new app **must** match:

| Invariant | Value | Why |
|-----------|-------|-----|
| Android package ID | `com.atomik.activity` | Same app identity for the OS. |
| Signing key | `mobile/android/app/debug.keystore` copied to `mobile-native/app/debug.keystore` | Different key → Android rejects update install. |
| `versionCode` | `2` (or higher than current `1`) | Lower or equal → "downgrade not allowed". |
| SQLite file | `location-offline.db` | Same path, Room opens existing file. |
| `location_buffer` schema | identical column names + types | Room schema match or runtime crash. |

What does **not** carry over (acceptable):
- The Expo TaskManager registration (we replace tracking with our own foreground service — transparent restart).
- Auth token (we drop auth — single-user C# backend).
- AsyncStorage values (not used in the native rewrite).
- React/Metro JS bundle and Hermes runtime (gone, replaced by native code).

---

## Risks & Rollback

| Risk | Mitigation | Rollback |
|------|-----------|----------|
| Signing key file lost | Copy `mobile/android/app/debug.keystore` into `mobile-native/app/` on day 1, commit it (it's a *debug* key, no production value). | If lost, generate a new key — but then users must uninstall first, losing buffered data. |
| Room schema rejects existing DB | T3.5 — fall back to raw SupportSQLiteOpenHelper if Room's validation is strict. | Worst case, scan + migrate rows on first launch. |
| FusedLocationProvider less aggressive than Expo's expo-location | Tune `minUpdateDistanceMeters` and add activity recognition to compensate. | Drop activity-recognition gating; raise update frequency. |
| Health Connect permission flow differs from RN library | Use the `ActivityResultContract` for `PermissionController.createRequestPermissionResultContract()`. Test on Pixel. | Steps-only via raw `SensorManager.TYPE_STEP_COUNTER` fallback. |
| `osmdroid` raster tile rendering glitchy in Compose `AndroidView` | Wrap with a `remember { MapView(ctx) }` + `DisposableEffect { onDispose { detach } }`. | Switch to MapLibre Native if osmdroid proves problematic. |
| User has Android 7/8 (< API 26) | Unsupported by Health Connect anyway; min SDK 26 is mandated. | Document the requirement. |
| Background location revoked by OS after long idle | Detect via `LocationRequest` callback failure, prompt user. | Manual re-enable in settings. |

---

## Non-Goals (v1)

- iOS port.
- Login / multi-user.
- Trip / stop detection logic (the C# backend has `/api/places/suggest` — UI for it is out of scope here).
- Charts beyond the current cards.
- Background sync without foreground service (Android 10+ requires the service for background location).
- Migration from Node.js backend; only the C# backend is supported.

---

## Phase X — Verification Checklist

- [ ] `mobile-native/` Gradle project assembles cleanly: `gradlew assembleDebug` exits 0, APK produced.
- [ ] APK signed with the copied debug keystore; `apksigner verify --print-certs app-debug.apk` shows the same SHA-256 fingerprint as the existing app.
- [ ] Install over the existing Expo build via `adb install -r` succeeds without `SIGNATURE_MISMATCH`.
- [ ] Existing `location_buffer` rows are still present after install (verify with a built-in diagnostic screen or `adb shell run-as com.atomik.activity sqlite3 databases/location-offline.db 'SELECT COUNT(*) FROM location_buffer'`).
- [ ] Foreground service notification appears on first launch after permission grants.
- [ ] Walk around the block → polyline appears in Timeline for today; backend `points` table grows.
- [ ] Switching to yesterday via the arrow/calendar fetches `/api/tracking/daily?date=yesterday` and renders the polyline.
- [ ] Health Connect tab: grant perms → 30-day backfill → today's steps + last night's sleep show; backend `health_steps_daily` and `sleep_sessions` populated.
- [ ] Idle-day battery measured < 3 % per 24 h.
- [ ] No analytics traffic in `mitmproxy` capture; the only outbound calls are to the C# backend.
- [ ] `android:allowBackup="false"` confirmed in the merged manifest of the built APK.

---

## Estimated effort

~5–7 days of focused work end-to-end. Critical path: T1 → T3 → T5 → T13 → T15 (must work for the update install to succeed). T8–T11 (UI + Health) parallelize once the data + service layers are in place.

---

## After this plan ships

- The Expo `mobile/` folder stays in the repo as a reference implementation until parity is confirmed; remove it in a follow-up PR.
- Consider a `mobile-native/release/` signing config with a personal key (not the debug key) for distributing to other people. Out of scope here.
