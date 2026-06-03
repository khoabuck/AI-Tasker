# 01_BUSINESS_RULES.md — AITasker Business Rules

## BR-00 General Rules

| Rule ID | Rule |
|---|---|
| BR-00-01 | A user must register/login before using Client or Expert features. |
| BR-00-02 | A user must select a role before accessing a role dashboard. |
| BR-00-03 | A user can be Client, AI Expert, or Admin. |
| BR-00-04 | Business logic must follow the main flows in the report. |
| BR-00-05 | Do not implement real payment in current scope. Payment is simulation only. |

---

## BR-01 Authentication and Role Rules

| Rule ID | Rule |
|---|---|
| BR-01-01 | User can register/login using email/password. |
| BR-01-02 | User can login using Google OAuth. |
| BR-01-03 | New account status starts as `PENDING_ROLE`. |
| BR-01-04 | If account status is `ACTIVE`, redirect user to dashboard according to role. |
| BR-01-05 | If account status is not `ACTIVE`, require profile/role completion. |
| BR-01-06 | Password must be hashed, never stored as plain text. |
| BR-01-07 | Google login stores `AuthProvider = GOOGLE` and `GoogleId`. |

---

## BR-02 Client Type Rules

| Rule ID | Rule |
|---|---|
| BR-02-01 | Client must select `INDIVIDUAL` or `BUSINESS`. |
| BR-02-02 | Individual Client must complete basic profile. |
| BR-02-03 | Individual Client platform fee rate = 5%. |
| BR-02-04 | Business Client must provide Company Name, Tax Code, Industry, Company Address. |
| BR-02-05 | Business Client platform fee rate = 10%. |
| BR-02-06 | Business Client verification status can be `PENDING_REVIEW`, `VERIFIED`, or `REJECTED`. |
| BR-02-07 | Full Business Client usage requires valid business information. |

---

## BR-03 Expert Profile Rules

| Rule ID | Rule |
|---|---|
| BR-03-01 | AI Expert must complete profile before applying jobs. |
| BR-03-02 | Expert profile includes bio, skills, portfolio, certificates, experience years, hourly rate. |
| BR-03-03 | Expert profile must be checked by AI Profile Checker using AI API. |
| BR-03-04 | If profile does not pass AI/Profile validation, Expert must edit profile. |
| BR-03-05 | Approved Expert has `ProfileReviewStatus = APPROVED` and account status `ACTIVE`. |

---

## BR-04 Job Rules

| Rule ID | Rule |
|---|---|
| BR-04-01 | Only active Client can create job. |
| BR-04-02 | Client can use AI Job Assistant or manual job creation. |
| BR-04-03 | AI Job Assistant must use real AI API, not rule-based/mock logic. |
| BR-04-04 | Job can be saved as `DRAFT`. |
| BR-04-05 | Valid submitted job has status `OPEN`. |
| BR-04-06 | Required fields: title, description, budget, deadline, required skills, expected deliverables. |
| BR-04-07 | `IsAIAssisted = true` if Client uses AI suggestion. |
| BR-04-08 | `IsAIAssisted = false` if Client creates manually or skips AI suggestion. |

---

## BR-05 Recommendation Rules

| Rule ID | Rule |
|---|---|
| BR-05-01 | Recommendation runs when job status = `OPEN`. |
| BR-05-02 | Only Experts with active account and approved profile are considered. |
| BR-05-03 | Matching result must include MatchScore and match reason. |
| BR-05-04 | Risk note should be stored when Expert has mismatch/weakness. |
| BR-05-05 | If no Expert is suitable, job remains `OPEN` and no Job Alert is sent. |
| BR-05-06 | AIRecommendations must not duplicate same JobId + ExpertId. |

### Match Score Formula

```text
Match Score =
50% Skill Match
+ 20% Rating/Profile Score
+ 20% Completed Projects/Experience
+ 10% Budget Fit
```

---

## BR-06 Proposal Rules

| Rule ID | Rule |
|---|---|
| BR-06-01 | Only approved AI Expert can submit proposal. |
| BR-06-02 | Expert can submit proposal only if job status = `OPEN`. |
| BR-06-03 | One Expert can submit only one proposal for one job. |
| BR-06-04 | Proposal required fields: cover letter, proposed price, proposed timeline, expected outputs, working approach. |
| BR-06-05 | Preliminary milestone plan is optional at proposal phase. |
| BR-06-06 | Valid proposal status = `SUBMITTED`. |
| BR-06-07 | Client receives notification after proposal is submitted. |

---

## BR-07 Negotiation and Contract Rules

| Rule ID | Rule |
|---|---|
| BR-07-01 | Client can accept proposal, reject proposal, send counter offer, or open realtime chat. |
| BR-07-02 | Negotiation room is created by ProposalId. |
| BR-07-03 | Only job Client and proposal Expert can join negotiation room. |
| BR-07-04 | Chat must use SignalR and messages must be saved to database. |
| BR-07-05 | Both Client and Expert must Mark as Agreed before Create Contract button appears. |
| BR-07-06 | AI Contract Draft Assistant can create draft from proposal, counter offer, and chat summary. |
| BR-07-07 | Contract preview must be validated before confirmation. |
| BR-07-08 | Total milestone amount must equal final price. |
| BR-07-09 | Acceptance criteria and deliverables cannot be empty. |
| BR-07-10 | Platform fee is calculated by ClientType. |
| BR-07-11 | Project is created only after both Client and Expert confirm contract. |
| BR-07-12 | New project status after contract confirmation = `PENDING_ESCROW`. |

---

## BR-08 Wallet and Escrow Simulation Rules

| Rule ID | Rule |
|---|---|
| BR-08-01 | Payment is wallet-based escrow simulation only. |
| BR-08-02 | No real payment gateway in current scope. |
| BR-08-03 | Client confirms escrow using simulated wallet balance. |
| BR-08-04 | Total Client payment = final contract price + platform fee. |
| BR-08-05 | Platform fee is recorded as simulated platform revenue. |
| BR-08-06 | Expert receivable amount = final contract price only. |
| BR-08-07 | Project becomes `ACTIVE` only after escrow lock succeeds. |
| BR-08-08 | Other proposals become `NOT_SELECTED` after project starts. |
| BR-08-09 | Job becomes `CLOSED` after project starts. |
| BR-08-10 | Each lock/release/refund/freeze must create transaction/audit log. |

---

## BR-09 Milestone and Deliverable Rules

| Rule ID | Rule |
|---|---|
| BR-09-01 | Project must have at least one milestone. |
| BR-09-02 | Expert submits deliverable by milestone. |
| BR-09-03 | Deliverable should include file URL or demo URL, description, version number, notes. |
| BR-09-04 | Client can Approve, Request Revision, or Open Dispute. |
| BR-09-05 | If approved, milestone status = `APPROVED`. |
| BR-09-06 | If revision requested, milestone status = `REVISION_REQUESTED`. |
| BR-09-07 | RevisionUsed cannot exceed RevisionLimit. |
| BR-09-08 | If revision limit is reached, Client must Approve or Open Dispute. |

---

## BR-10 Dispute Rules

| Rule ID | Rule |
|---|---|
| BR-10-01 | Client or AI Expert can open dispute. |
| BR-10-02 | Dispute can be opened only by project participants. |
| BR-10-03 | A milestone cannot have multiple open disputes at the same time. |
| BR-10-04 | When dispute opens, project status = `DISPUTED`. |
| BR-10-05 | When dispute opens, milestone status = `DISPUTED`. |
| BR-10-06 | When dispute opens, milestone payment status = `FROZEN`. |
| BR-10-07 | Admin resolves dispute after reviewing contract, milestone, deliverables, chat history, evidence, escrow transactions. |
| BR-10-08 | Admin decisions: release to Expert, refund to Client, partial split. |
| BR-10-09 | After Admin decision, dispute status = `RESOLVED`. |

---

## BR-11 Project Completion Rules

| Rule ID | Rule |
|---|---|
| BR-11-01 | Project completes only when all milestones are approved or resolved. |
| BR-11-02 | Project cannot complete while a milestone payment is `FROZEN`. |
| BR-11-03 | Project completion creates final summary. |
| BR-11-04 | Review opens only after project status = `COMPLETED`. |

---

## BR-12 Review Rules

| Rule ID | Rule |
|---|---|
| BR-12-01 | Only Client can review AI Expert. |
| BR-12-02 | AI Expert cannot review Client in current scope. |
| BR-12-03 | Review is allowed only when project status = `COMPLETED`. |
| BR-12-04 | Each completed project can have at most one Client-to-Expert review. |
| BR-12-05 | Rating must be from 1 to 5. |
| BR-12-06 | System updates only Expert rating average and Expert review count. |
| BR-12-07 | Client rating is not updated. |
| BR-12-08 | Admin can hide review if it violates policy. |
