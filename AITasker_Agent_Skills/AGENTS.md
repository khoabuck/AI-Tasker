# AGENTS.md — AITasker Coding Agent Rules

## Project Identity

Project name: **AITasker**  
Project type: **AI Marketplace Platform for AI Automation Services**  
Course/project context: **SWP391**

AITasker is a web platform connecting Clients who need AI automation services with AI Experts. The system supports AI-assisted job creation, AI expert matching, realtime negotiation, contract preview, wallet-based escrow simulation, milestone-based delivery, dispute resolution, and Client-to-Expert review.

---

## Must-Read Files Before Coding

The coding agent must read these files before editing or generating code:

1. `docs/AITasker_SWP391_Report.md`
2. `database/AITasker_Final_UPDATED.sql`
3. `docs/00_PROJECT_CONTEXT.md`
4. `docs/01_BUSINESS_RULES.md`
5. `docs/03_API_CONTRACT.md`
6. `docs/07_ENUM_STATUS_RULES.md`

For backend tasks, also read:

- `docs/04_BACKEND_GUIDE.md`
- `docs/02_DATABASE_SCHEMA_GUIDE.md`
- `docs/08_AI_INTEGRATION_GUIDE.md`
- `docs/09_SIGNALR_CHAT_GUIDE.md`
- `docs/10_WALLET_ESCROW_SIMULATION_RULES.md`
- `docs/11_REVIEW_DISPUTE_RULES.md`

For frontend tasks, also read:

- `docs/05_FRONTEND_GUIDE.md`
- `docs/06_ROUTE_MAP.md`
- `docs/03_API_CONTRACT.md`
- `docs/07_ENUM_STATUS_RULES.md`

---

## Source of Truth Priority

When there is a conflict, follow this priority:

1. Latest user instruction in the current task.
2. `database/AITasker_Final_UPDATED.sql` for database schema, column types, constraints, and enum/status values.
3. `docs/07_ENUM_STATUS_RULES.md` for enum/status usage in code.
4. `docs/AITasker_SWP391_Report.md` for business scope, actors, and main flows.
5. `docs/01_BUSINESS_RULES.md` for implementation business rules.
6. `docs/03_API_CONTRACT.md` for API routes, request/response shapes, and frontend-backend integration.
7. Existing codebase.

Do not invent new business rules if they are not present in the source-of-truth documents.

---

## Technology Stack

Backend:

- ASP.NET Core Web API
- C#
- Entity Framework Core
- SQL Server
- JWT Authentication
- Google OAuth
- ASP.NET Core SignalR
- Gemini API / DeepSeek API integration

Frontend:

- ReactJS
- Tailwind CSS
- React Router
- Axios
- React Query
- Vercel deployment

Deployment:

- Frontend: Vercel
- Backend: Render / Railway / Koyeb candidate
- CI/CD: GitHub Actions

---

## Non-Negotiable Business Rules

1. Use real AI API integration for AI features.
2. Do not use rule-based/mock logic as the main AI logic.
3. Gemini API is the preferred AI provider; DeepSeek API can be fallback.
4. Payment is wallet-based escrow simulation only.
5. Do not implement real payment gateway in current scope.
6. Do not implement Stripe/VNPay/MoMo production payment.
7. Do not implement real payout/withdrawal for Expert.
8. Use SignalR for realtime negotiation chat and project chat.
9. Client must be either `INDIVIDUAL` or `BUSINESS`.
10. Individual Client platform fee = 5%.
11. Business Client platform fee = 10%.
12. Business Client must provide Company Name, Tax Code, Industry, Company Address.
13. Expert profile must be checked by AI Profile Checker before becoming active/approved.
14. Only Client can review AI Expert.
15. AI Expert cannot review Client in the current scope.
16. Each completed project can have at most one Client-to-Expert review.
17. Project can become ACTIVE only after escrow is confirmed/locked.
18. Expert receives simulated money only when Client approves deliverable or Admin resolves dispute in Expert's favor.

---

## Coding Rules

- Do not rename enum/status values without updating `docs/07_ENUM_STATUS_RULES.md`.
- Do not add entities/tables/columns that are not in `database/AITasker_Final_UPDATED.sql` unless explicitly requested.
- Do not skip input validation.
- Do not bypass role-based authorization.
- Use DTOs for request/response.
- Do not expose password hash or internal secrets.
- All API responses must follow the standard response format.
- AI provider API keys must be read from environment variables.
- Never commit `.env`, API keys, JWT secrets, or database password.
- Backend must expose `/api/health` for deployment check.
- Frontend must use environment variable `VITE_API_BASE_URL`.

---

## Standard API Response

Use this response shape for REST APIs:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "errors": []
}
```

For error:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": ["Title is required."]
}
```

---

## Build Order Recommendation

Follow `docs/13_SPRINT_BACKLOG.md`.

Do not jump to Flow 6/7 before Flow 1–5 are stable.
