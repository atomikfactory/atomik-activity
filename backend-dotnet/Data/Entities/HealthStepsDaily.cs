namespace BackendDotnet.Data.Entities;

public class HealthStepsDaily
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Date { get; set; } = string.Empty;   // YYYY-MM-DD (local TZ, from device)
    public int Steps { get; set; }
    public string? Source { get; set; }
    public DateTime UpdatedAt { get; set; }
}
