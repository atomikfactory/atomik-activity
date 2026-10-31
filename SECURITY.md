# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately using GitHub private vulnerability reporting:
open the repository **Security** tab and choose **Report a vulnerability**.

Please do not open public issues for security problems. Include a description, reproduction
steps, and the affected component (`backend`, `backend-dotnet`, `web`, `mobile-native`, or `deploy`).

## Supported versions

Only the latest commit on `main` is supported.

## Notes for self-hosters

- Set strong values for `POSTGRES_PASSWORD` and `JWT_SECRET`; never use the example values.
- Do not expose the database port publicly.
- Put the stack behind HTTPS (for example a reverse proxy) when it is reachable from the internet.
