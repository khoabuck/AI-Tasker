# 14_AGENT_PROMPTS.md — Suggested Prompts for Coding Agent

## General Start Prompt

```text
You are coding the AITasker SWP391 project.
Before coding, read AGENTS.md and all docs in docs/.
Follow AITasker_SWP391_Report.md and database/AITasker_Final_UPDATED.sql as source of truth.
Do not invent business rules.
Do not implement real payment.
Use AI API integration for AI features, not rule-based/mock logic.
Only Client can review AI Expert.
Now implement the requested task step by step and explain changed files.
```

---

## Backend Phase Prompt

```text
Implement backend Phase [number/name] for AITasker.
Read:
- AGENTS.md
- docs/01_BUSINESS_RULES.md
- docs/02_DATABASE_SCHEMA_GUIDE.md
- docs/03_API_CONTRACT.md
- docs/04_BACKEND_GUIDE.md
- docs/07_ENUM_STATUS_RULES.md
- database/AITasker_Final_UPDATED.sql

Requirements:
- Use ASP.NET Core Web API.
- Use layered architecture.
- Use DTOs.
- Use standard ApiResponse.
- Add validation and role/resource authorization.
- Do not break existing APIs.
- Return changed files and test instructions.
```

---

## Frontend Phase Prompt

```text
Implement frontend Phase [number/name] for AITasker.
Read:
- AGENTS.md
- docs/03_API_CONTRACT.md
- docs/05_FRONTEND_GUIDE.md
- docs/06_ROUTE_MAP.md
- docs/07_ENUM_STATUS_RULES.md

Requirements:
- Use ReactJS.
- Use Tailwind CSS.
- Use Axios API client.
- Use React Router.
- Follow route map.
- Do not invent endpoints.
- Show loading/error/empty states.
- Return changed files and how to test.
```

---

## AI Integration Prompt

```text
Implement AI integration for AITasker.
Read docs/08_AI_INTEGRATION_GUIDE.md.
Use Gemini API as primary provider and DeepSeek as fallback if configured.
AI API keys must come from environment variables.
AI request/response must be stored in AIRequestLogs.
AI output must be parsed and validated before saving.
Do not use rule-based/mock logic as main AI implementation.
```

---

## SignalR Prompt

```text
Implement SignalR realtime chat for AITasker.
Read docs/09_SIGNALR_CHAT_GUIDE.md.
Create /hubs/chat.
Support proposal rooms and project rooms.
Persist all messages in Messages table.
Only authorized Client/Expert can join room.
Implement Mark as Agreed for proposal negotiation.
Enable Create Contract only when both sides agreed.
```

---

## Escrow Simulation Prompt

```text
Implement wallet-based escrow simulation.
Read docs/10_WALLET_ESCROW_SIMULATION_RULES.md.
Do not implement real payment gateway.
Use wallet balances, escrow records, and payment transactions.
Project becomes ACTIVE only after escrow lock succeeds.
Platform fee is simulated platform revenue and is not paid to Expert.
Use database transaction for lock/release/refund.
```

---

## Review Prompt

```text
Implement Client-to-Expert review.
Read docs/11_REVIEW_DISPUTE_RULES.md.
Only Client can review AI Expert after project COMPLETED.
AI Expert cannot review Client.
Each project has at most one review.
Update only Expert rating average and review count.
```
