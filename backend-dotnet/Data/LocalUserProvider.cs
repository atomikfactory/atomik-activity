using BackendDotnet.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BackendDotnet.Data;

// Holds the one shared user that all writes/reads use. No auth — single-user local mode.
public class LocalUserProvider
{
    public const string LocalEmail = "local@local.test";

    public Guid UserId { get; private set; }
    public string Email => LocalEmail;

    public async Task InitializeAsync(AppDbContext db)
    {
        var existing = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == LocalEmail);
        if (existing is not null)
        {
            UserId = existing.Id;
            return;
        }

        var user = new User { Email = LocalEmail, PasswordHash = "local-no-auth" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        UserId = user.Id;
    }
}
