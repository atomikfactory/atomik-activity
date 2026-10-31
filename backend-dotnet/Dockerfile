FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore layer cached separately from source for faster rebuilds
COPY backend-dotnet.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /out --no-restore

# ─── Runtime image ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /out .

ENV ASPNETCORE_URLS=http://0.0.0.0:3000
EXPOSE 3000

ENTRYPOINT ["dotnet", "backend-dotnet.dll"]
