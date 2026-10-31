using BackendDotnet.Data;
using BackendDotnet.Endpoints;
using BackendDotnet.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:3000");

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .AllowAnyOrigin()
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddSingleton<LocalUserProvider>();
builder.Services.AddSingleton<PointsJsonWriter>();

var app = builder.Build();

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS places (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            category    TEXT NOT NULL DEFAULT 'other',
            latitude    DOUBLE PRECISION NOT NULL,
            longitude   DOUBLE PRECISION NOT NULL,
            radius_m    INTEGER NOT NULL DEFAULT 75,
            color       TEXT,
            created_at  TIMESTAMP NOT NULL DEFAULT now(),
            updated_at  TIMESTAMP NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_places_user ON places (user_id);

        CREATE TABLE IF NOT EXISTS health_steps_daily (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date        TEXT NOT NULL,
            steps       INTEGER NOT NULL,
            source      TEXT,
            updated_at  TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT health_steps_daily_user_date_unique UNIQUE (user_id, date)
        );

        CREATE TABLE IF NOT EXISTS sleep_sessions (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            external_id  TEXT,
            start_time   TIMESTAMP NOT NULL,
            end_time     TIMESTAMP NOT NULL,
            duration_min INTEGER NOT NULL,
            stages       JSONB,
            source       TEXT,
            created_at   TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT sleep_sessions_user_ext_unique UNIQUE (user_id, external_id)
        );
    """);

    var local = app.Services.GetRequiredService<LocalUserProvider>();
    await local.InitializeAsync(db);
    app.Logger.LogInformation("Local user resolved: {UserId}", local.UserId);
}

app.MapAuthEndpoints();
app.MapTrackingEndpoints();
app.MapPlacesEndpoints();
app.MapHealthDataEndpoints();
app.MapGet("/api/ping", () => Results.Ok(new { status = "ok" }));

app.Run();
