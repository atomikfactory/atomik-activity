using System.Globalization;
using BackendDotnet.Data;
using BackendDotnet.Data.Entities;
using BackendDotnet.Services;
using Microsoft.EntityFrameworkCore;

namespace BackendDotnet.Endpoints;

public record DeletePointsRequest(List<Guid> Ids);

public record BatchItem(
    double Latitude,
    double Longitude,
    double? Accuracy,
    double? Altitude,
    double? Speed,
    double? Heading,
    long Timestamp
);

public record BatchRequest(List<BatchItem>? Items);

public record TrackedDayRow(string Day, int Count);

public static class TrackingEndpoints
{
    public static void MapTrackingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tracking");

        group.MapPost("/batch", async (
            BatchRequest body,
            AppDbContext db,
            LocalUserProvider local,
            PointsJsonWriter exporter) =>
        {
            if (body.Items is null || body.Items.Count == 0)
                return Results.BadRequest(new { error = "Valid items array required" });

            var points = body.Items.Select(i => new Point
            {
                UserId = local.UserId,
                Latitude = i.Latitude,
                Longitude = i.Longitude,
                Accuracy = i.Accuracy,
                Altitude = i.Altitude,
                Speed = i.Speed,
                Heading = i.Heading,
                Timestamp = DateTime.SpecifyKind(DateTimeOffset.FromUnixTimeMilliseconds(i.Timestamp).UtcDateTime, DateTimeKind.Unspecified),
                ActivityType = null
            }).ToList();

            db.Points.AddRange(points);
            await db.SaveChangesAsync();

            await exporter.AppendAsync(body.Items, local.UserId);

            return Results.Ok(new { success = true, count = points.Count });
        });

        group.MapGet("/daily", async (string? date, string? tz, AppDbContext db, LocalUserProvider local) =>
        {
            if (string.IsNullOrWhiteSpace(date))
                return Results.BadRequest(new { error = "Date required YYYY-MM-DD" });

            if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
                return Results.BadRequest(new { error = "Invalid date, expected YYYY-MM-DD" });

            if (!TryResolveZone(tz, out var zone))
                return Results.BadRequest(new { error = $"Unknown time zone '{tz}'" });

            var dayStart = LocalMidnightUtc(day, zone);
            var dayEnd = LocalMidnightUtc(day.AddDays(1), zone);

            var points = await db.Points
                .AsNoTracking()
                .Where(p => p.UserId == local.UserId && p.Timestamp >= dayStart && p.Timestamp < dayEnd)
                .OrderBy(p => p.Timestamp)
                .Select(p => new
                {
                    id = p.Id,
                    latitude = p.Latitude,
                    longitude = p.Longitude,
                    timestamp = p.Timestamp
                })
                .ToListAsync();

            return Results.Ok(new
            {
                date,
                pointsCount = points.Count,
                points
            });
        });

        group.MapGet("/range", async (string? from, string? to, string? tz, AppDbContext db, LocalUserProvider local) =>
        {
            if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
                return Results.BadRequest(new { error = "from and to required (YYYY-MM-DD)" });

            if (!DateOnly.TryParseExact(from, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fromDay) ||
                !DateOnly.TryParseExact(to, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var toDay))
                return Results.BadRequest(new { error = "Invalid date, expected YYYY-MM-DD" });

            if (toDay < fromDay)
                return Results.BadRequest(new { error = "'to' must be on or after 'from'" });

            if (!TryResolveZone(tz, out var zone))
                return Results.BadRequest(new { error = $"Unknown time zone '{tz}'" });

            var rangeStart = LocalMidnightUtc(fromDay, zone);
            var rangeEnd = LocalMidnightUtc(toDay.AddDays(1), zone);

            var points = await db.Points
                .AsNoTracking()
                .Where(p => p.UserId == local.UserId && p.Timestamp >= rangeStart && p.Timestamp < rangeEnd)
                .OrderBy(p => p.Timestamp)
                .Select(p => new
                {
                    id = p.Id,
                    latitude = p.Latitude,
                    longitude = p.Longitude,
                    timestamp = p.Timestamp
                })
                .ToListAsync();

            return Results.Ok(new
            {
                from,
                to,
                pointsCount = points.Count,
                points
            });
        });

        group.MapGet("/dates", async (string? tz, AppDbContext db, LocalUserProvider local) =>
        {
            if (!TryResolveZone(tz, out var zone))
                return Results.BadRequest(new { error = $"Unknown time zone '{tz}'" });

            // Timestamps are stored as UTC; bucket them by the caller's local calendar day.
            // Postgres understands the same IANA ids as TimeZoneInfo on Linux.
            var zoneId = zone.Id;
            var rows = await db.Database.SqlQuery<TrackedDayRow>($"""
                SELECT to_char(("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE {zoneId}, 'YYYY-MM-DD') AS "Day",
                       COUNT(*)::int AS "Count"
                FROM points
                WHERE user_id = {local.UserId}
                GROUP BY 1
                ORDER BY 1 DESC
                """).ToListAsync();

            return Results.Ok(rows.Select(r => new { date = r.Day, count = r.Count }));
        });

        group.MapDelete("/points", async (
            [Microsoft.AspNetCore.Mvc.FromBody] DeletePointsRequest body,
            AppDbContext db,
            LocalUserProvider local) =>
        {
            if (body.Ids is null || body.Ids.Count == 0)
                return Results.BadRequest(new { error = "Ids required" });

            var deleted = await db.Points
                .Where(p => p.UserId == local.UserId && body.Ids.Contains(p.Id))
                .ExecuteDeleteAsync();

            return Results.Ok(new { deleted });
        });

        group.MapGet("/latest", async (AppDbContext db, LocalUserProvider local) =>
        {
            var latest = await db.Points
                .AsNoTracking()
                .Where(p => p.UserId == local.UserId)
                .OrderByDescending(p => p.Timestamp)
                .Select(p => new
                {
                    id = p.Id,
                    latitude = p.Latitude,
                    longitude = p.Longitude,
                    timestamp = p.Timestamp
                })
                .FirstOrDefaultAsync();

            if (latest is null)
                return Results.Ok(new { hasData = false });

            return Results.Ok(new { hasData = true, latest });
        });
    }

    // `tz` is an IANA id (e.g. "Europe/Paris"). Missing => UTC, the historical behaviour.
    private static bool TryResolveZone(string? tz, out TimeZoneInfo zone)
    {
        zone = TimeZoneInfo.Utc;
        if (string.IsNullOrWhiteSpace(tz)) return true;
        if (!TimeZoneInfo.TryFindSystemTimeZoneById(tz.Trim(), out var found)) return false;
        zone = found;
        return true;
    }

    // UTC instant (as the Unspecified DateTime stored in the DB) of local midnight on `day`.
    private static DateTime LocalMidnightUtc(DateOnly day, TimeZoneInfo zone)
    {
        var local = day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        // A DST gap at midnight (rare) makes the time invalid; step forward to the first valid instant.
        while (zone.IsInvalidTime(local)) local = local.AddMinutes(30);
        var utc = TimeZoneInfo.ConvertTimeToUtc(local, zone);
        return DateTime.SpecifyKind(utc, DateTimeKind.Unspecified);
    }
}
