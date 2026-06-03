# 06_ROUTE_MAP.md — Frontend Route Map

## Public / Guest Routes

| Route | Page | Access |
|---|---|---|
| `/` | Home page | Guest/User |
| `/login` | Login page | Guest |
| `/register` | Register page | Guest |
| `/auth/google/callback` | Google OAuth callback | Guest |
| `/select-role` | Role selection | Authenticated user with PENDING_ROLE |

---

## Onboarding Routes

| Route | Page | Access |
|---|---|---|
| `/onboarding/client-type` | Select Individual/Business Client | Authenticated CLIENT pending profile |
| `/onboarding/client/individual` | Individual Client Profile Form | Individual Client |
| `/onboarding/client/business` | Business Client Verification Form | Business Client |
| `/onboarding/expert-profile` | Expert Profile Form | Expert |
| `/onboarding/expert-profile/ai-check` | AI Profile Checker Result | Expert |

---

## Client Routes

| Route | Page |
|---|---|
| `/client/dashboard` | Client Dashboard |
| `/client/profile` | Client Profile |
| `/client/jobs` | My Jobs |
| `/client/jobs/create` | Create Job |
| `/client/jobs/:jobId` | Job Detail |
| `/client/jobs/:jobId/edit` | Edit Job Draft |
| `/client/jobs/:jobId/recommended-experts` | Recommended Experts |
| `/client/jobs/:jobId/proposals` | Proposal List |
| `/client/proposals/:proposalId` | Proposal Detail |
| `/client/proposals/:proposalId/chat` | Negotiation Chat |
| `/client/contracts/:contractId` | Contract Preview |
| `/client/projects` | My Projects |
| `/client/projects/:projectId` | Project Detail |
| `/client/projects/:projectId/escrow` | Confirm Escrow |
| `/client/milestones/:milestoneId/review` | Milestone Deliverable Review |
| `/client/disputes/create` | Open Dispute |
| `/client/projects/:projectId/review` | Review Expert |
| `/client/wallet` | Simulated Wallet |
| `/client/transactions` | Transaction History |

---

## Expert Routes

| Route | Page |
|---|---|
| `/expert/dashboard` | Expert Dashboard |
| `/expert/profile` | Expert Profile |
| `/expert/profile/edit` | Edit Expert Profile |
| `/expert/recommended-jobs` | Recommended Jobs |
| `/expert/jobs` | Browse Jobs |
| `/expert/jobs/:jobId` | Job Detail |
| `/expert/jobs/:jobId/proposal` | Submit Proposal |
| `/expert/proposals` | My Proposals |
| `/expert/proposals/:proposalId` | Proposal Detail |
| `/expert/proposals/:proposalId/chat` | Negotiation Chat |
| `/expert/contracts/:contractId` | Contract Preview |
| `/expert/projects` | My Projects |
| `/expert/projects/:projectId` | Project Detail |
| `/expert/milestones/:milestoneId/deliverable` | Submit Deliverable |
| `/expert/disputes/create` | Open Dispute |
| `/expert/reviews` | Received Reviews |
| `/expert/wallet` | Simulated Wallet / Earnings |
| `/expert/transactions` | Earning History |

Important: Do not create `/expert/review-client` route in current scope.

---

## Admin Routes

| Route | Page |
|---|---|
| `/admin/dashboard` | Admin Dashboard |
| `/admin/users` | User Management |
| `/admin/clients/business-verification` | Business Verification Management |
| `/admin/experts` | Expert Profile Management |
| `/admin/jobs` | Job Management |
| `/admin/proposals` | Proposal Management |
| `/admin/projects` | Project Management |
| `/admin/transactions` | Transaction Management |
| `/admin/disputes` | Dispute Management |
| `/admin/disputes/:disputeId` | Dispute Detail |
| `/admin/reviews` | Review Management |
| `/admin/audit-logs` | Audit Logs |

---

## Route Guard Rules

| Guard | Behavior |
|---|---|
| GuestOnly | Redirect logged-in user to dashboard. |
| AuthRequired | Redirect unauthenticated user to login. |
| RoleRequired(CLIENT) | Only CLIENT can access. |
| RoleRequired(EXPERT) | Only EXPERT can access. |
| RoleRequired(ADMIN) | Only ADMIN can access. |
| ActiveRequired | User must have account status ACTIVE. |
| ProfileRequired | User must complete required profile. |

---

## Dashboard Redirect Rule

| Role/Status | Redirect |
|---|---|
| No token | `/login` |
| PENDING_ROLE | `/select-role` |
| CLIENT + profile incomplete | `/onboarding/client-type` |
| EXPERT + profile incomplete | `/onboarding/expert-profile` |
| CLIENT + ACTIVE | `/client/dashboard` |
| EXPERT + ACTIVE | `/expert/dashboard` |
| ADMIN + ACTIVE | `/admin/dashboard` |
