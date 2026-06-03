# 07_ENUM_STATUS_RULES.md — Enum, Status, and Score Rules

Do not invent enum values. Use these values consistently in backend, frontend, database, seed data, and docs.

This file must follow `AITasker_Final.sql` as the source of truth.

---

## 1. User and Auth Enums

### User Role

```text
CLIENT
EXPERT
ADMIN
```

### User Status

```text
PENDING_ROLE
PENDING_PROFILE
PENDING_AI_REVIEW
ACTIVE
SUSPENDED
BANNED
```

Rules:

- New account starts with `PENDING_ROLE`.
- After role selection, account can move to `PENDING_PROFILE`.
- Expert profile waiting for AI review can use `PENDING_AI_REVIEW`.
- Fully usable account uses `ACTIVE`.
- Admin temporary lock/suspend should use `SUSPENDED`, not `LOCKED`.
- Permanent ban should use `BANNED`.

### Auth Provider

```text
LOCAL
GOOGLE
```

---

## 2. Client Profile Enums

### Client Type

```text
INDIVIDUAL
BUSINESS
```

### Business Verification Status

```text
NOT_REQUIRED
PENDING_REVIEW
VERIFIED
REJECTED
```

Rules:

- Individual Client must use `BusinessVerificationStatus = NOT_REQUIRED`.
- Business Client can use `PENDING_REVIEW`, `VERIFIED`, or `REJECTED`.
- Individual Client platform fee rate = `5.00`.
- Business Client platform fee rate = `10.00`.

---

## 3. Expert Profile Enums

### Expert Profile Review Status

```text
PENDING_REVIEW
APPROVED
REJECTED
```

Rules:

- Do not use `PENDING`.
- Do not use `NEEDS_REVISION` unless SQL is changed first.
- If an Expert must edit profile again, keep status as `REJECTED` or `PENDING_REVIEW` depending on the flow and show `ProfileReviewNote`.

### Expert Level

```text
JUNIOR
MID
SENIOR
```

### Skill Level

```text
BEGINNER
INTERMEDIATE
ADVANCED
```

---

## 4. Service Enums

### Service Status

```text
ACTIVE
INACTIVE
HIDDEN
```

### Expert Service Status

```text
ACTIVE
PAUSED
REMOVED
```

---

## 5. Job and Recommendation Enums

### Job Status

```text
DRAFT
OPEN
CLOSED
CANCELLED
EXPIRED
```

Rules:

- Save draft job = `DRAFT`.
- Submit valid job = `OPEN`.
- Job should become `CLOSED` after proposal/contract/project starts.
- Cancelled job = `CANCELLED`.
- Expired job = `EXPIRED`.

### Project Complexity

```text
SIMPLE
MEDIUM
COMPLEX
```

---

## 6. Proposal and Contract Enums

### Proposal Status

```text
SUBMITTED
COUNTER_OFFERED
ACCEPTED
REJECTED
WITHDRAWN
NOT_SELECTED
```

Rules:

- Expert submits proposal = `SUBMITTED`.
- Client sends counter offer = `COUNTER_OFFERED`.
- Selected proposal = `ACCEPTED`.
- Client rejects proposal = `REJECTED`.
- Expert withdraws proposal = `WITHDRAWN`.
- Other proposals after one proposal is accepted = `NOT_SELECTED`.

### Contract Status

```text
DRAFT
CONFIRMED
CANCELLED
```

### Contract Source

```text
PROPOSAL
CHAT_AGREEMENT
```

---

## 7. Project, Milestone, Deliverable, and Escrow Enums

### Project Status

```text
PENDING_ESCROW
ACTIVE
COMPLETED
CANCELLED
DISPUTED
```

### Project Escrow Status

```text
NOT_LOCKED
LOCKED
PARTIALLY_RELEASED
RELEASED
REFUNDED
FROZEN
```

Rules:

- Do not use `PENDING` for `Projects.EscrowStatus`.
- Before escrow lock, use `NOT_LOCKED`.
- After escrow lock, use `LOCKED`.
- If some milestones are released but project still has active milestones, use `PARTIALLY_RELEASED`.
- If all escrow is released, use `RELEASED`.
- If all escrow is refunded, use `REFUNDED`.
- If dispute freezes escrow, use `FROZEN`.

### Milestone Status

```text
PENDING
IN_PROGRESS
SUBMITTED
REVISION_REQUESTED
APPROVED
DISPUTED
CANCELLED
```

Rules:

- Do not use `RESOLVED` for `Milestones.Status` unless SQL is changed first.
- After dispute is resolved, set milestone to `APPROVED`, `CANCELLED`, or another valid status depending on Admin decision.

### Milestone Payment Status

```text
ESCROW_LOCKED
RELEASED
REFUNDED
FROZEN
```

Rules:

- Do not use `PENDING` for `Milestones.PaymentStatus`.
- Do not use `LOCKED` for `Milestones.PaymentStatus`; use `ESCROW_LOCKED`.

### Deliverable Status

```text
SUBMITTED
APPROVED
REVISION_REQUESTED
DISPUTED
```

Rules:

- Do not use `REJECTED` for deliverables unless SQL is changed first.
- If Client rejects quality but still allows revision, use `REVISION_REQUESTED`.
- If disagreement becomes a dispute, use `DISPUTED`.

### Escrow Status

```text
PENDING
LOCKED
RELEASED
REFUNDED
FROZEN
```

---

## 8. Payment Transaction Enums

### Transaction Type

```text
ESCROW_LOCK
ESCROW_RELEASE
REFUND
PARTIAL_REFUND
```

### Transaction Status

```text
PENDING
SUCCESS
FAILED
```

---

## 9. Chat, Notification, Dispute, and Review Enums

### Message Type

```text
TEXT
SYSTEM
AGREEMENT
CONTRACT_TRIGGER
```

### Notification Type

```text
JOB_ALERT
PROPOSAL
CONTRACT
PROJECT
MILESTONE
DISPUTE
REVIEW
PAYMENT
SERVICE
SYSTEM
```

### Dispute Status

```text
OPEN
UNDER_REVIEW
RESOLVED
```

### Dispute Resolution Type

```text
RELEASE_TO_EXPERT
REFUND_TO_CLIENT
PARTIAL_SPLIT
```

### Review Status

```text
VISIBLE
HIDDEN
```

Rules:

- Expert cannot review Client in current scope.
- Only Client can review AI Expert after project completion.
- Do not create `CLIENT_REVIEWED`, `EXPERT_REVIEWED`, or two-way review statuses.

---

## 10. AI Enums

### AI Provider

```text
GEMINI
DEEPSEEK
```

### AI Request Status

```text
SUCCESS
FAILED
```

### AI Module Name

```text
AI_JOB_ASSISTANT
PROFILE_CHECKER
RECOMMENDATION
PROPOSAL_ANALYZER
CONTRACT_DRAFT
DELIVERABLE_REVIEW
DISPUTE_SUMMARY
```

---

## 11. Numeric Score Rules

### Expert Profile Score

```text
ProfileScore: 0-100
```

Rules:

- `ExpertProfiles.ProfileScore` must use a 0-100 scale.
- Use `DECIMAL(5,2)` in SQL Server.
- Valid range: `0 <= ProfileScore <= 100`.
- AI Profile Checker should return JSON like `{ "profileScore": 82 }`.
- Do not use a 1-5 scale for `ProfileScore`.

### AI Recommendation Match Score

```text
MatchScore: 0-100
```

Rules:

- `AIRecommendations.MatchScore` must use a 0-100 scale.
- Valid range: `0 <= MatchScore <= 100`.

### Expert Rating Average

```text
RatingAverage: 0-5
```

Rules:

- `ExpertProfiles.RatingAverage` is based on Client reviews.
- This is different from `ProfileScore`.

### Review Rating

```text
Rating: 1-5
```

Rules:

- `Reviews.Rating` must be from 1 to 5.

---

## 12. Important Notes

- Database check constraints are the final source of truth for allowed enum values.
- If backend, frontend, or docs need a new enum value, update SQL constraints first, then update this file.
- Do not invent enum values inside services, controllers, frontend constants, seed data, or tests.
- Payment is simulation, so do not add real payment provider statuses.
