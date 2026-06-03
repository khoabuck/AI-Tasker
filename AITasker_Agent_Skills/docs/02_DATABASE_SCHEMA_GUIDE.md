# 02_DATABASE_SCHEMA_GUIDE.md — Database Schema Guide

## Database Source of Truth

The database source of truth is:

```text
database/AITasker_Final_UPDATED.sql
```

Do not create tables/columns that are not in the SQL file unless the user explicitly asks.

---

## Entity Overview

| Table | Purpose |
|---|---|
| Users | Stores account, role, authentication provider, status. |
| ClientProfiles | Stores Individual/Business Client profile and platform fee rate. |
| ExpertProfiles | Stores AI Expert profile, rating, AI profile score, verification state. |
| Wallets | Stores simulated wallet balance. |
| Services | Optional AI service templates created by Admin. |
| Skills | Master skill list. |
| ExpertSkills | Skills owned by Expert. |
| JobPostings | Jobs posted by Client. |
| JobSkills | Required skills for each job. |
| AIRecommendations | Matching result between jobs and Experts. |
| AIRequestLogs | AI API request/response logs. |
| Proposals | Expert proposals for jobs. |
| ProjectContracts | Final contract terms after negotiation. |
| Projects | Created after contract confirmation. |
| Milestones | Milestones inside project. |
| Deliverables | Deliverable submissions and versions. |
| Escrows | Escrow simulation records. |
| PaymentTransactions | Wallet/escrow transaction history. |
| Messages | Chat messages for job/proposal/project context. |
| Disputes | Dispute records. |
| DisputeEvidences | Evidence files/text for disputes. |
| Reviews | Client-to-Expert review. |
| Notifications | User notifications. |
| AuditLogs | Important system/user actions. |

---

## Important Entity Rules

### Users

- `Role`: CLIENT / EXPERT / ADMIN.
- `AuthProvider`: LOCAL / GOOGLE.
- `Status`: PENDING_ROLE / PENDING_PROFILE / PENDING_AI_REVIEW / ACTIVE / SUSPENDED / BANNED.
- `GoogleId` nullable and unique when not null.

### ClientProfiles

- `ClientType`: INDIVIDUAL / BUSINESS.
- Individual Client:
  - `BusinessVerificationStatus = NOT_REQUIRED`.
  - `PlatformFeeRate = 5.00`.
- Business Client:
  - Must have `CompanyName`, `TaxCode`, `Industry`, `CompanyAddress`.
  - `PlatformFeeRate = 10.00`.
  - Verification status can be PENDING_REVIEW / VERIFIED / REJECTED.
- ClientProfiles does not use rating in current scope.

### ExpertProfiles

- Stores `RatingAverage` and `ReviewCount` because Expert receives Client reviews.
- Stores AI profile checker result:
  - `ProfileScore` uses 0-100 scale, SQL type `DECIMAL(5,2)`
  - `Level`
  - `ProfileReviewStatus`
  - `ProfileReviewNote`

### JobPostings

- Draft job status = `DRAFT`.
- Submitted valid job status = `OPEN`.
- Job becomes `CLOSED` after project starts.
- `IsAIAssisted` indicates whether AI Job Assistant was used.

### AIRecommendations

- One row per Job + Expert.
- Must store MatchScore and MatchReason.
- RiskNote is recommended if present in SQL.

### Proposals

- One Expert can submit one proposal for one job.
- Preliminary milestone plan is optional.
- Official milestones are finalized in ProjectContract/Milestones.

### ProjectContracts

Stores final agreement:

- FinalPrice
- PlatformFeeRate
- PlatformFeeAmount
- TotalClientPayment
- FinalTimelineDays
- Deliverables
- AcceptanceCriteria
- RevisionLimit
- PaymentTerms
- ContractSource
- ChatSummary
- ClientConfirmed
- ExpertConfirmed
- Status

Fee formula:

```text
PlatformFeeAmount = FinalPrice * PlatformFeeRate / 100
TotalClientPayment = FinalPrice + PlatformFeeAmount
```

### Projects

- Created after contract confirmed.
- Starts as `PENDING_ESCROW`.
- Becomes `ACTIVE` after escrow lock.
- Becomes `COMPLETED` when all milestones are approved or resolved.

### Milestones

- Belongs to Project.
- Has amount, due date, revision limit, revision used.
- Has `PaymentStatus` and business `Status`.

### Escrows

- Stores simulated escrow amount.
- May be per project or per milestone depending implementation.
- Does not store ExpertId directly. Expert comes from Projects.ExpertId.

### PaymentTransactions

Transaction types:

- ESCROW_LOCK
- ESCROW_RELEASE
- REFUND
- PARTIAL_REFUND

### Messages

- Used for realtime chat.
- Can belong to Job, Proposal, or Project context.
- `MessageType`: TEXT / SYSTEM / AGREEMENT / CONTRACT_TRIGGER.
- `IsAgreementMarked`: used in Flow 5.

### Reviews

- Only Client reviews AI Expert.
- Each project has at most one review.
- ReviewerId must be project Client user.
- RevieweeId must be project Expert user.
- Enforce ReviewerId/RevieweeId rule in backend service because SQL check cannot join Projects.

---

## Backend EF Core Advice

- Use entity classes matching SQL names and column types.
- Use Fluent API for unique constraints and relationships.
- Use DTOs instead of exposing EF entities directly.
- Do not expose PasswordHash.
- Use migrations only if the team has decided to use EF migrations. Otherwise keep SQL as schema source of truth.

---

## High-Risk Areas

1. Review one-way rule: Client -> Expert only.
2. Platform fee: Client pays it, Expert does not receive it.
3. Escrow simulation: no real payment gateway.
4. Create Contract from chat requires both Client and Expert Mark as Agreed.
5. Business Client requires 4 verification fields.
6. AI features must call AI API service, not rule-based mock.
