namespace BackendDotnet.Data.Entities;

public class SleepSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? ExternalId { get; set; }     // Health Connect record UID — idempotency key
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int DurationMin { get; set; }
    public string? Stages { get; set; }         // JSON array stored as JSONB
    public string? Source { get; set; }
    public DateTime CreatedAt { get; set; }
}
