using BackendDotnet.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BackendDotnet.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Point> Points => Set<Point>();
    public DbSet<Place> Places => Set<Place>();
    public DbSet<HealthStepsDaily> HealthStepsDaily => Set<HealthStepsDaily>();
    public DbSet<SleepSession> SleepSessions => Set<SleepSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("users");
            b.HasKey(u => u.Id);
            b.Property(u => u.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            b.Property(u => u.Email).HasColumnName("email").IsRequired();
            b.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
            b.Property(u => u.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp").HasDefaultValueSql("now()");
            b.Property(u => u.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp").HasDefaultValueSql("now()");
            b.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Point>(b =>
        {
            b.ToTable("points");
            b.HasKey(p => p.Id);
            b.Property(p => p.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            b.Property(p => p.UserId).HasColumnName("user_id");
            b.Property(p => p.Latitude).HasColumnName("latitude");
            b.Property(p => p.Longitude).HasColumnName("longitude");
            b.Property(p => p.Accuracy).HasColumnName("accuracy");
            b.Property(p => p.Altitude).HasColumnName("altitude");
            b.Property(p => p.Speed).HasColumnName("speed");
            b.Property(p => p.Heading).HasColumnName("heading");
            b.Property(p => p.Timestamp).HasColumnName("timestamp").HasColumnType("timestamp");
            b.Property(p => p.ActivityType).HasColumnName("activity_type");
            b.Property(p => p.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<HealthStepsDaily>(b =>
        {
            b.ToTable("health_steps_daily");
            b.HasKey(h => h.Id);
            b.Property(h => h.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            b.Property(h => h.UserId).HasColumnName("user_id");
            b.Property(h => h.Date).HasColumnName("date").IsRequired();
            b.Property(h => h.Steps).HasColumnName("steps");
            b.Property(h => h.Source).HasColumnName("source");
            b.Property(h => h.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp").HasDefaultValueSql("now()");
            b.HasIndex(h => new { h.UserId, h.Date }).IsUnique().HasDatabaseName("health_steps_daily_user_date_unique");
        });

        modelBuilder.Entity<SleepSession>(b =>
        {
            b.ToTable("sleep_sessions");
            b.HasKey(s => s.Id);
            b.Property(s => s.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            b.Property(s => s.UserId).HasColumnName("user_id");
            b.Property(s => s.ExternalId).HasColumnName("external_id");
            b.Property(s => s.StartTime).HasColumnName("start_time").HasColumnType("timestamp");
            b.Property(s => s.EndTime).HasColumnName("end_time").HasColumnType("timestamp");
            b.Property(s => s.DurationMin).HasColumnName("duration_min");
            b.Property(s => s.Stages).HasColumnName("stages").HasColumnType("jsonb");
            b.Property(s => s.Source).HasColumnName("source");
            b.Property(s => s.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp").HasDefaultValueSql("now()");
            b.HasIndex(s => new { s.UserId, s.ExternalId }).IsUnique().HasDatabaseName("sleep_sessions_user_ext_unique");
        });

        modelBuilder.Entity<Place>(b =>
        {
            b.ToTable("places");
            b.HasKey(p => p.Id);
            b.Property(p => p.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            b.Property(p => p.UserId).HasColumnName("user_id");
            b.Property(p => p.Name).HasColumnName("name").IsRequired();
            b.Property(p => p.Category).HasColumnName("category").HasDefaultValue("other");
            b.Property(p => p.Latitude).HasColumnName("latitude");
            b.Property(p => p.Longitude).HasColumnName("longitude");
            b.Property(p => p.RadiusM).HasColumnName("radius_m").HasDefaultValue(75);
            b.Property(p => p.Color).HasColumnName("color");
            b.Property(p => p.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp").HasDefaultValueSql("now()");
            b.Property(p => p.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp").HasDefaultValueSql("now()");
        });
    }
}
