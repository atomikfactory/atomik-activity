using System.Text.Json;
using BackendDotnet.Endpoints;

namespace BackendDotnet.Services;

// Mirrors every batch into data/points.json (top-level array). Personal-use scale only.
public class PointsJsonWriter
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly string _filePath;
    private readonly ILogger<PointsJsonWriter> _log;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public PointsJsonWriter(IWebHostEnvironment env, ILogger<PointsJsonWriter> log)
    {
        var dir = Path.Combine(env.ContentRootPath, "data");
        Directory.CreateDirectory(dir);
        _filePath = Path.Combine(dir, "points.json");
        _log = log;
    }

    public async Task AppendAsync(IEnumerable<BatchItem> items, Guid userId)
    {
        await _gate.WaitAsync();
        try
        {
            var rows = new List<ExportedPoint>();

            if (File.Exists(_filePath) && new FileInfo(_filePath).Length > 0)
            {
                try
                {
                    await using var read = File.OpenRead(_filePath);
                    var parsed = await JsonSerializer.DeserializeAsync<List<ExportedPoint>>(read, JsonOptions);
                    if (parsed is not null) rows = parsed;
                }
                catch (JsonException ex)
                {
                    _log.LogWarning(ex, "points.json was unreadable; starting fresh");
                }
            }

            var now = DateTime.UtcNow;
            foreach (var i in items)
            {
                rows.Add(new ExportedPoint(
                    userId,
                    i.Latitude,
                    i.Longitude,
                    i.Accuracy,
                    i.Altitude,
                    i.Speed,
                    i.Heading,
                    i.Timestamp,
                    DateTimeOffset.FromUnixTimeMilliseconds(i.Timestamp).UtcDateTime,
                    now
                ));
            }

            await using var write = File.Create(_filePath);
            await JsonSerializer.SerializeAsync(write, rows, JsonOptions);
        }
        finally
        {
            _gate.Release();
        }
    }

    private record ExportedPoint(
        Guid UserId,
        double Latitude,
        double Longitude,
        double? Accuracy,
        double? Altitude,
        double? Speed,
        double? Heading,
        long TimestampMs,
        DateTime Timestamp,
        DateTime ReceivedAt
    );
}
