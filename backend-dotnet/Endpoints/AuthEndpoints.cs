using BackendDotnet.Data;

namespace BackendDotnet.Endpoints;

// No-op auth: returns the local user + a fixed dummy token regardless of credentials.
public static class AuthEndpoints
{
    private const string DummyToken = "local-dev-token";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", (LocalUserProvider local) => Results.Ok(new
        {
            token = DummyToken,
            user = new { id = local.UserId, email = local.Email }
        }));

        group.MapPost("/register", (LocalUserProvider local) => Results.Ok(new
        {
            token = DummyToken,
            user = new { id = local.UserId, email = local.Email }
        }));

        group.MapGet("/me", (LocalUserProvider local) => Results.Ok(new
        {
            id = local.UserId,
            email = local.Email
        }));
    }
}
