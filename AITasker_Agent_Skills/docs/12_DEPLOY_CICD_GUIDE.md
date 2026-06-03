# 12_DEPLOY_CICD_GUIDE.md — Deployment and CI/CD Guide

## Deployment Direction

Frontend is planned for:

```text
Vercel
```

Backend candidate platforms:

```text
Render
Railway
Koyeb
```

The final backend platform can be selected later based on free-tier/trial availability and ASP.NET Core compatibility.

---

## Frontend Deployment: Vercel

Rules:

- Connect GitHub repository to Vercel.
- Set root directory to frontend folder if using monorepo.
- Set environment variable:

```text
VITE_API_BASE_URL=https://your-backend-url
```

- Do not hardcode backend URL.
- Vercel auto-builds on push.

---

## Backend Deployment Candidate Requirements

Backend host must support:

- ASP.NET Core Web API.
- Environment variables.
- SQL Server connection string.
- HTTPS.
- WebSocket/SignalR support if possible.
- Public API URL for frontend.

---

## Database Deployment

Options:

1. Local SQL Server for development.
2. Cloud SQL Server for deployed demo.
3. SQL Server with safe public endpoint if required.

Do not expose database password in code.

---

## GitHub Secrets

Recommended secrets:

```text
BACKEND_DEPLOY_TOKEN
DATABASE_CONNECTION_STRING
JWT_KEY
JWT_ISSUER
JWT_AUDIENCE
GOOGLE_CLIENT_ID
GEMINI_API_KEY
DEEPSEEK_API_KEY
FRONTEND_BASE_URL
```

---

## Backend Environment Variables

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=...
Jwt__Key=...
Jwt__Issuer=...
Jwt__Audience=...
GoogleAuth__ClientId=...
Gemini__ApiKey=...
DeepSeek__ApiKey=...
Frontend__BaseUrl=https://your-vercel-app.vercel.app
```

---

## CI/CD Pipeline Steps

Backend pipeline:

1. Checkout code.
2. Setup .NET.
3. Restore dependencies.
4. Build.
5. Run tests if available.
6. Publish artifact.
7. Deploy to selected backend host.
8. Call `/api/health`.

Frontend pipeline:

1. Vercel auto-builds on push.
2. Build React app.
3. Deploy preview/production.

---

## Health Check

Backend must expose:

```text
GET /api/health
```

Expected response:

```json
{
  "success": true,
  "message": "AITasker API is healthy.",
  "data": {
    "status": "OK"
  },
  "errors": []
}
```

---

## Deployment Rules

- Never commit `.env`.
- Never commit API keys.
- Never commit database password.
- Use GitHub Secrets / environment variables.
- Frontend must call deployed backend URL.
- Backend must configure CORS for frontend URL.
- SignalR must allow frontend origin.

---

## CORS Example

Allow:

```text
http://localhost:5173
https://your-vercel-app.vercel.app
```

Do not use wildcard `*` with credentials in production.
