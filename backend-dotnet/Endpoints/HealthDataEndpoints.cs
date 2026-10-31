using System.Globalization;
using System.Text.Json;
using BackendDotnet.Data;
using BackendDotnet.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BackendDotnet.Endpoints;

public record StepsItem(string Date, int Steps, string? Source);

public record SleepStageItem(int Stage, string StartTime, string EndTime);

public record SleepItem(
    string ExternalId,
    string StartTime,
    string EndTime,
    int DurationMin,
    SleepStageItem[]? Stages,
    string? Source
);

public record HealthBatchRequest(StepsItem[]? Steps, SleepItem[]? Sleep);

public static class HealthDataEndpoints
{
    public static void MapHealthDataEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/health");

        // POST /api/health/batch — upsert steps + sleep from the device
        group.MapPost("/batch", async (
            HealthBatchRequest body,
            AppDbContext db,
            LocalUserProvider local) =>
        {
            var stepsCount = 0;
            var sleepCount = 0;

            foreach (var s in body.Steps ?? [])
            {
                if (string.IsNullOrWhiteSpace(s.Date)) continue;

                await db.Database.ExecuteSqlRawAsync("""
                    INSERT INTO health_steps_daily (id, user_id, date, steps, source, updated_at)
                    VALUES (gen_random_uuid(), {0}, {1}, {2}, {3}, NOW())
                    ON CONFLICT ON CONSTRAINT health_steps_daily_user_date_unique
                    DO UPDATE SET steps = EXCLUDED.steps, source = EXCLUDED.source, updated_at = NOW()
                    """, local.UserId, s.Date, s.Steps, s.Source as object ?? DBNull.Value);

                stepsCount++;
            }

            foreach (var sl in body.Sleep ?? [])
            {
                if (string.IsNullOrWhiteSpace(sl.ExternalId) ||
                    string.IsNullOrWhiteSpace(sl.StartTime) ||
                    string.IsNullOrWhiteSpace(sl.EndTime)) continue;

                if (!DateTime.TryParse(sl.StartTime, null, DateTimeStyles.RoundtripKind, out var start) ||
                    !DateTime.TryParse(sl.EndTime, null, DateTimeStyles.RoundtripKind, out var end))
                    continue;

                var stagesJson = sl.Stages is { Length: > 0 }
                    ? JsonSerializer.Serialize(sl.Stages)
                    : null;

                await db.Database.ExecuteSqlRawAsync("""
                    INSERT INTO sleep_sessions
                      (id, user_id, external_id, start_time, end_time, duration_min, stages, source, created_at)
                    VALUES (gen_random_uuid(), {0}, {1}, {2}, {3}, {4}, {5}::jsonb, {6}, NOW())
                    ON CONFLICT ON CONSTRAINT sleep_sessions_user_ext_unique DO NOTHING
                    """,
                    local.UserId,
                    sl.ExternalId,
                    DateTime.SpecifyKind(start, DateTimeKind.Unspecified),
                    DateTime.SpecifyKind(end, DateTimeKind.Unspecified),
                    sl.DurationMin,
                    stagesJson as object ?? DBNull.Value,
                    sl.Source as object ?? DBNull.Value);

                sleepCount++;
            }

            return Results.Ok(new { success = true, stepsCount, sleepCount });
        });

        // GET /api/health/daily?date=YYYY-MM-DD
        group.MapGet("/daily", async (string? date, AppDbContext db, LocalUserProvider local) =>
        {
            if (string.IsNullOrWhiteSpace(date))
                return Results.BadRequest(new { error = "date required (YYYY-MM-DD)" });

            var steps = await db.HealthStepsDaily
                .AsNoTracking()
                .Where(h => h.UserId == local.UserId && h.Date == date)
                .Select(h => new { h.Steps, h.Source })
                .FirstOrDefaultAsync();

            // Last sleep session whose end_time falls on this date (UTC date comparison)
            if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var day))
                return Results.BadRequest(new { error = "Invalid date, expected YYYY-MM-DD" });

            var dayStart = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
            var dayEnd = DateTime.SpecifyKind(day.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);

            var sleep = await db.SleepSessions
                .AsNoTracking()
                .Where(s => s.UserId == local.UserId && s.EndTime >= dayStart && s.EndTime < dayEnd)
                .OrderByDescending(s => s.EndTime)
                .Select(s => new
                {
                    externalId = s.ExternalId,
                    startTime = s.StartTime,
                    endTime = s.EndTime,
                    durationMin = s.DurationMin,
                    stages = s.Stages,
                    source = s.Source
                })
                .FirstOrDefaultAsync();

            return Results.Ok(new
            {
                date,
                steps = steps?.Steps,
                stepsSource = steps?.Source,
                sleep
            });
        });
    }
}
