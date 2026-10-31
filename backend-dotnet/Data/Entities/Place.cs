namespace BackendDotnet.Data.Entities;

public class Place
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "other"; // home | work | recurring | other (free-form)
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int RadiusM { get; set; } = 75;
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
