# 13_SPRINT_BACKLOG.md — AITasker Sprint Backlog

## Team Assumption

- 3 Backend developers.
- 2 Frontend developers.

Goal: build flow-by-flow to avoid random/inconsistent implementation.

---

## Phase 0 — Project Setup

### Backend

- Create ASP.NET Core Web API project.
- Setup SQL Server connection.
- Add EF Core.
- Add standard ApiResponse.
- Add global exception middleware.
- Add Swagger.
- Add health check `/api/health`.
- Setup JWT skeleton.

### Frontend

- Create React project.
- Setup Tailwind CSS.
- Setup React Router.
- Setup Axios instance.
- Setup React Query.
- Setup layouts.
- Setup route guards skeleton.

### Output

- Backend runs locally.
- Frontend runs locally.
- Frontend can call `/api/health`.

---

## Phase 1 — Auth + Role + Profile

### Backend

- Register/Login.
- Google Login.
- JWT.
- Select Role.
- Individual Client profile.
- Business Client profile.
- Expert profile.
- AI Profile Checker integration.

### Frontend

- Register/Login pages.
- Google Login button.
- Select Role page.
- Client Type page.
- Individual profile form.
- Business profile form.
- Expert profile form.
- AI profile result UI.

### Done When

- User can become active Individual Client.
- User can become active Business Client.
- User can become approved AI Expert.

---

## Phase 2 — Job + AI Job Assistant

### Backend

- Create job draft.
- Update job.
- Submit job.
- AI Job Assistant endpoint.
- Job list/detail.
- Client jobs.

### Frontend

- Create Job page.
- AI suggestion UI.
- Accept/Edit/Regenerate/Skip.
- Save Draft/Submit.
- My Jobs page.

### Done When

- Client can create AI-assisted or manual job.
- Submitted job status = OPEN.

---

## Phase 3 — Recommendation + Proposal

### Backend

- Generate recommendations.
- Store AIRecommendations.
- Client view Recommended Experts.
- Expert view Recommended Jobs.
- Browse Jobs.
- Submit proposal.
- Prevent duplicate proposal.

### Frontend

- Recommended Experts page.
- Recommended Jobs page.
- Browse Jobs page.
- Job Detail page.
- Submit Proposal page.
- Proposal list/detail.

### Done When

- Client sees recommended Experts.
- Expert sees recommended jobs and submits proposal.

---

## Phase 4 — Realtime Negotiation + Contract

### Backend

- SignalR Chat Hub.
- Proposal chat messages.
- Mark as Agreed.
- Create Contract from chat.
- AI Contract Draft Assistant.
- Contract preview.
- Confirm contract.
- Create project PENDING_ESCROW.

### Frontend

- Negotiation Chat page.
- Typing/receive message.
- Mark as Agreed button.
- Create Contract button.
- Contract Preview page.
- Confirm contract buttons.

### Done When

- Client and Expert can negotiate realtime.
- Contract appears only after both agree.
- Project created as PENDING_ESCROW after both confirm.

---

## Phase 5 — Wallet/Escrow Simulation + Project Execution

### Backend

- Wallet view/top-up simulation.
- Confirm escrow.
- ESCROW_LOCK transaction.
- Project ACTIVE.
- Milestone list.
- Submit deliverable.
- Approve deliverable.
- Request revision.
- ESCROW_RELEASE.

### Frontend

- Wallet page.
- Confirm Escrow page.
- Project Detail page.
- Milestone view.
- Submit Deliverable page.
- Review Deliverable UI.
- Revision feedback UI.

### Done When

- Client confirms simulated escrow.
- Expert submits deliverable.
- Client approves and Expert receives simulated release.

---

## Phase 6 — Dispute + Review

### Backend

- Open dispute.
- Submit evidence.
- Admin dispute dashboard.
- Resolve dispute.
- Release/refund/partial split.
- Project completion check.
- Client review Expert.
- Expert received reviews.

### Frontend

- Dispute form.
- Admin dispute dashboard/detail.
- Admin resolve dispute UI.
- Client review Expert page.
- Expert received reviews page.

### Done When

- Admin can resolve dispute.
- Project completes.
- Client can review Expert only.

---

## Phase 7 — Admin Dashboard

### Backend

- Admin user list.
- Admin job list.
- Admin project list.
- Admin transaction list.
- Admin review management.
- Dashboard statistics.

### Frontend

- Admin dashboard.
- User management.
- Job/project/transaction/dispute/review pages.

### Done When

- Admin can monitor major system data.

---

## Phase 8 — Deployment + Final QA

### Tasks

- Configure environment variables.
- Deploy frontend to Vercel.
- Deploy backend to selected host.
- Configure CORS.
- Test SignalR from deployed frontend.
- Test AI API keys.
- Test wallet simulation.
- Test full flow 1–7.

### Done When

- Demo works end-to-end.
- No API keys committed.
- `/api/health` works.

---

## Priority Rules

P0:

- Auth.
- Role/profile.
- Job creation.
- Proposal.
- Contract.
- Escrow simulation.

P1:

- AI recommendation.
- SignalR chat.
- Dispute.
- Review.

P2:

- Admin dashboard polish.
- Deploy CI/CD.
- Advanced AI modules.
