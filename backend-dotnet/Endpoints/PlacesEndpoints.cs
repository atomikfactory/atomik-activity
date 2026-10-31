using System.Globalization;
using BackendDotnet.Data;
using BackendDotnet.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BackendDotnet.Endpoints;

public record CreatePlaceRequest(
    string Name,
    string? Category,
    double Latitude,
    double Longitude,
    int? RadiusM,
    string? Color
);

public record UpdatePlaceRequest(
    string? Name,
    string? Category,
    double? Latitude,
    double? Longitude,
    int? RadiusM,
    string? Color
);

public static class PlacesEndpoints
{
    private const double EarthRadiusM = 6_371_000;

    public static void MapPlacesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/places");

        group.MapGet("/", async (AppDbContext db, LocalUserProvider local) =>
        {
            var places = await db.Places
                .AsNoTracking()
                .Where(p => p.UserId == local.UserId)
                .OrderBy(p => p.Name)
                .ToListAsync();
            return Results.Ok(places);
        });

        group.MapPost("/", async (CreatePlaceRequest body, AppDbContext db, LocalUserProvider local) =>
        {
            if (string.IsNullOrWhiteSpace(body.Name))
                return Results.BadRequest(new { error = "Name required" });

            var place = new Place
            {
                UserId = local.UserId,
                Name = body.Name.Trim(),
                Category = string.IsNullOrWhiteSpace(body.Category) ? "other" : body.Category.Trim(),
                Latitude = body.Latitude,
                Longitude = body.Longitude,
                RadiusM = body.RadiusM ?? 75,
                Color = body.Color,
            };
            db.Places.Add(place);
            await db.SaveChangesAsync();
            return Results.Ok(place);
        });

        group.MapPatch("/{id:guid}", async (Guid id, UpdatePlaceRequest body, AppDbContext db, LocalUserProvider local) =>
        {
            var place = await db.Places.FirstOrDefaultAsync(p => p.Id == id && p.UserId == local.UserId);
            if (place is null) return Results.NotFound();

            if (body.Name is { Length: > 0 }) place.Name = body.Name.Trim();
            if (body.Category is { Length: > 0 }) place.Category = body.Category.Trim();
            if (body.Latitude.HasValue) place.Latitude = body.Latitude.Value;
            if (body.Longitude.HasValue) place.Longitude = body.Longitude.Value;
            if (body.RadiusM.HasValue) place.RadiusM = body.RadiusM.Value;
            if (body.Color is not null) place.Color = body.Color;
            place.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

            await db.SaveChangesAsync();
            return Results.Ok(place);
        });

        group.MapDelete("/{id:guid}", async (Guid id, AppDbContext db, LocalUserProvider local) =>
        {
            var place = await db.Places.FirstOrDefaultAsync(p => p.Id == id && p.UserId == local.UserId);
            if (place is null) return Results.NotFound();
            db.Places.Remove(place);
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });

        // ---- Suggestions: detect stop-clusters from raw points in a range ----
        group.MapGet("/suggest", async (string? from, string? to, int? minDwellMinutes, int? maxResults,
                                       AppDbContext db, LocalUserProvider local) =>
        {
            if (!TryParseRange(from, to, out var rangeStart, out var rangeEnd, out var err))
                return Results.BadRequest(new { error = err });

            var minDwellMs = (minDwellMinutes ?? 15) * 60_000L;
            var top = maxResults ?? 20;
            const double stayRadiusM = 75; // movement within this is "still here"
            const double clusterRadiusM = 120; // stop events within this merge into one place

            var rawPoints = await db.Points
                .AsNoTracking()
                .Where(p => p.UserId == local.UserId && p.Timestamp >= rangeStart && p.Timestamp < rangeEnd)
                .OrderBy(p => p.Timestamp)
                .Select(p => new PointTuple(p.Latitude, p.Longitude, p.Timestamp))
                .ToListAsync();

            // Pass 1: extract stop events (consecutive points within stayRadiusM)
            var events = new List<StopEvent>();
            if (rawPoints.Count > 0)
            {
                int anchor = 0;
                for (int i = 1; i < rawPoints.Count; i++)
                {
                    var d = HaversineMeters(
                        rawPoints[anchor].Lat, rawPoints[anchor].Lng,
                        rawPoints[i].Lat, rawPoints[i].Lng);
                    if (d > stayRadiusM)
                    {
                        EmitEvent(rawPoints, anchor, i - 1, events, minDwellMs);
                        anchor = i;
                    }
                }
                EmitEvent(rawPoints, anchor, rawPoints.Count - 1, events, minDwellMs);
            }

            // Pass 2: cluster stop events by proximity
            var clusters = new List<Cluster>();
            foreach (var ev in events)
            {
                Cluster? best = null;
                double bestD = double.MaxValue;
                foreach (var c in clusters)
                {
                    var d = HaversineMeters(c.Lat, c.Lng, ev.Lat, ev.Lng);
                    if (d < clusterRadiusM && d < bestD) { best = c; bestD = d; }
                }
                if (best is null)
                {
                    clusters.Add(new Cluster
                    {
                        Lat = ev.Lat,
                        Lng = ev.Lng,
                        TotalDwellMs = ev.DwellMs,
                        VisitCount = 1,
                        FirstSeen = ev.StartUtc,
                        LastSeen = ev.EndUtc,
                    });
                }
                else
                {
                    var newCount = best.VisitCount + 1;
                    best.Lat = (best.Lat * best.VisitCount + ev.Lat) / newCount;
                    best.Lng = (best.Lng * best.VisitCount + ev.Lng) / newCount;
                    best.VisitCount = newCount;
                    best.TotalDwellMs += ev.DwellMs;
                    if (ev.StartUtc < best.FirstSeen) best.FirstSeen = ev.StartUtc;
                    if (ev.EndUtc > best.LastSeen) best.LastSeen = ev.EndUtc;
                }
            }

            var result = clusters
                .OrderByDescending(c => c.TotalDwellMs)
                .Take(top)
                .Select(c => new
                {
                    latitude = c.Lat,
                    longitude = c.Lng,
                    totalDwellMs = c.TotalDwellMs,
                    visitCount = c.VisitCount,
                    firstSeen = c.FirstSeen,
                    lastSeen = c.LastSeen,
                });

            return Results.Ok(result);
        });

        // ---- Stats: per-place dwell + visits inside a range ----
        group.MapGet("/stats", async (string? from, string? to, AppDbContext db, LocalUserProvider local) =>
        {
            if (!TryParseRange(from, to, out var rangeStart, out var rangeEnd, out var err))
                return Results.BadRequest(new { error = err });

            var places = await db.Places
                .AsNoTracking()
                .Where(p => p.UserId == local.UserId)
                .ToListAsync();

            if (places.Count == 0)
                return Results.Ok(Array.Empty<object>());

            var points = await db.Points
                .AsNoTracking()
                .Where(p => p.UserId == local.UserId && p.Timestamp >= rangeStart && p.Timestamp < rangeEnd)
                .OrderBy(p => p.Timestamp)
                .Select(p => new PointTuple(p.Latitude, p.Longitude, p.Timestamp))
                .ToListAsync();

            var result = new List<object>(places.Count);
            foreach (var place in places)
            {
                long dwellMs = 0;
                int visits = 0;
                int? runStart = null;
                for (int i = 0; i < points.Count; i++)
                {
                    var d = HaversineMeters(place.Latitude, place.Longitude, points[i].Lat, points[i].Lng);
                    var inside = d <= place.RadiusM;
                    if (inside && runStart is null) runStart = i;
                    else if (!inside && runStart is not null)
                    {
                        dwellMs += SpanMs(points[runStart.Value].Ts, points[i - 1].Ts);
                        visits++;
                        runStart = null;
                    }
                }
                if (runStart is not null)
                {
                    dwellMs += SpanMs(points[runStart.Value].Ts, points[^1].Ts);
                    visits++;
                }

                result.Add(new
                {
                    placeId = place.Id,
                    name = place.Name,
                    category = place.Category,
                    latitude = place.Latitude,
                    longitude = place.Longitude,
                    radiusM = place.RadiusM,
                    color = place.Color,
                    totalDwellMs = dwellMs,
                    visitCount = visits,
                });
            }

            return Results.Ok(result);
        });
    }

    // ---- helpers ----

    private static void EmitEvent(List<PointTuple> raw, int startIdx, int endIdx, List<StopEvent> sink, long minDwellMs)
    {
        if (endIdx <= startIdx) return;
        var startT = raw[startIdx].Ts;
        var endT = raw[endIdx].Ts;
        var span = (long)(endT - startT).TotalMilliseconds;
        if (span < minDwellMs) return;

        double sumLat = 0, sumLng = 0;
        for (int i = startIdx; i <= endIdx; i++)
        {
            sumLat += raw[i].Lat;
            sumLng += raw[i].Lng;
        }
        int count = endIdx - startIdx + 1;

        sink.Add(new StopEvent
        {
            Lat = sumLat / count,
            Lng = sumLng / count,
            DwellMs = span,
            StartUtc = DateTime.SpecifyKind(startT, DateTimeKind.Utc),
            EndUtc = DateTime.SpecifyKind(endT, DateTimeKind.Utc),
        });
    }

    private record PointTuple(double Lat, double Lng, DateTime Ts);

    private static long SpanMs(DateTime a, DateTime b)
    {
        var ms = (long)(b - a).TotalMilliseconds;
        return ms < 0 ? 0 : ms;
    }

    private static double HaversineMeters(double lat1, double lng1, double lat2, double lng2)
    {
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLng = (lng2 - lng1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return 2 * EarthRadiusM * Math.Asin(Math.Sqrt(a));
    }

    private static bool TryParseRange(string? from, string? to, out DateTime start, out DateTime end, out string error)
    {
        start = default; end = default; error = string.Empty;
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
        { error = "from and to required (YYYY-MM-DD)"; return false; }
        if (!DateOnly.TryParseExact(from, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fd) ||
            !DateOnly.TryParseExact(to, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var td))
        { error = "Invalid date, expected YYYY-MM-DD"; return false; }
        if (td < fd) { error = "'to' must be on or after 'from'"; return false; }
        start = DateTime.SpecifyKind(fd.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        end = DateTime.SpecifyKind(td.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        return true;
    }

    private class StopEvent
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public long DwellMs { get; set; }
        public DateTime StartUtc { get; set; }
        public DateTime EndUtc { get; set; }
    }

    private class Cluster
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public long TotalDwellMs { get; set; }
        public int VisitCount { get; set; }
        public DateTime FirstSeen { get; set; }
        public DateTime LastSeen { get; set; }
    }
}
