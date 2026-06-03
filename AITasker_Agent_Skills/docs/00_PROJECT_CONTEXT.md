# 00_PROJECT_CONTEXT.md — AITasker Context

## Project Summary

AITasker is an AI-focused freelance marketplace. It connects Clients who need AI automation services with AI Experts who can deliver AI-related work.

The platform supports the full flow:

1. Register/Login with email/password or Google OAuth.
2. Role selection and profile verification.
3. Client creates AI job/request with optional AI Job Assistant.
4. System recommends suitable AI Experts.
5. AI Expert browses recommended/open jobs and sends proposal.
6. Client and Expert negotiate realtime using SignalR.
7. System creates Project Contract Preview after both sides agree.
8. Wallet-based escrow simulation locks money before work starts.
9. Expert submits deliverables by milestone.
10. Client approves, requests revision, or opens dispute.
11. Admin resolves disputes.
12. Client reviews AI Expert after project completion.

---

## Main Actors

| Actor | Meaning |
|---|---|
| Guest / Visitor | User who has not logged in yet. |
| Individual Client | Client using the platform as an individual, platform fee = 5%. |
| Business Client | Client using the platform as a business, needs business verification, platform fee = 10%. |
| AI Expert | Freelancer/consultant/engineer who provides AI services. |
| Admin | System manager who monitors users, jobs, disputes, transactions, reviews. |

---

## Supporting Modules

| Module | Responsibility |
|---|---|
| Google OAuth | Real Google login. |
| AI API Provider | Gemini/DeepSeek API for AI features. |
| AI Profile Checker | Checks Expert profile quality. |
| AI Job Assistant | Generates job title/description/skills/budget/timeline/deliverables. |
| AI Expert Recommendation | Matches job requirements with Expert profile/skills. |
| SignalR Chat Hub | Realtime chat, typing, online status. |
| Notification Module | Normal/realtime notifications. |
| Platform Fee Module | Calculates 5%/10% platform fee. |
| Wallet Module | Simulated user wallet balance. |
| Escrow Module | Simulated lock/release/refund/freeze. |
| Dispute Module | Stores disputes and Admin resolution. |
| Review Module | Stores Client-to-Expert reviews. |

---

## Core Scope

In scope:

- Email/password auth.
- Google OAuth.
- JWT auth.
- Role-based profile.
- Individual/Business Client.
- AI API integration.
- SignalR realtime chat.
- Wallet-based escrow simulation.
- Dispute resolution.
- Client review Expert only.
- Admin dashboard.
- Vercel frontend deploy.
- Backend free-tier deployment candidate.

Out of scope:

- Real payment gateway.
- Real payout/withdrawal.
- Self-training AI model.
- Hosting own LLM.
- Native mobile app.
- Real legal e-signature.
- Video call.

---

## Main Flow List

| Flow | Name |
|---|---|
| Flow 1 | Register/Login with Email or Google & Role-based Profile Verification |
| Flow 2 | Client Creates Main Request / Job with AI Job Assistant |
| Flow 3 | System Matches Client Main Request with AI Expert Skills |
| Flow 4 | Expert Reviews AI-recommended Jobs / Browses Jobs and Sends Proposal |
| Flow 5 | Client and Expert Negotiate and Confirm Project Terms |
| Flow 6 | Wallet-based Escrow Simulation and Project Execution |
| Flow 7 | Dispute Resolution, Project Completion, Client Review and Rating |
