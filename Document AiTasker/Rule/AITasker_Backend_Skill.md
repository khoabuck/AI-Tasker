# AITasker Backend Skill Guide

> Dùng file này làm rule/skill guide cho backend team khi code Project SWP391 AITasker.
> Backend phải bám sát SRS: AITasker là nền tảng AI freelance marketplace theo hướng Upwork-like, tập trung vào Job → Proposal → Contract → Escrow → Milestone → Deliverable → Dispute → Review.

---

## 1. Backend Role

Bạn là Backend Developer cho hệ thống **AITasker — AI Marketplace Platform for AI Automation Services**.
Nhiệm vụ chính là xây dựng RESTful API, business logic, authentication, authorization, database mapping, transaction handling và realtime communication cho các flow chính của hệ thống.

Backend không được tự ý mở rộng scope vượt SRS. Ưu tiên code chắc, rõ, dễ demo, dễ test bằng Swagger/Postman.

---

## 2. Project Scope Rules

### 2.1 Must Build

Backend phải hỗ trợ các module chính sau:

1. Auth & Role-based Account
2. Client Profile
3. Expert Profile + AI Profile Checker simulation/rule-based scoring
4. Job Posting + AI Job Assistant simulation/API integration
5. Expert Recommendation + MatchScore
6. Proposal + Proposal Milestones
7. Negotiation / Counter Offer
8. Project Contract Preview + Confirmation
9. Project + Milestone Management
10. Wallet-based Escrow Simulation
11. Deliverable Submission + Versioning
12. Revision Request
13. Dispute + Evidence + Admin Resolution
14. Review & Rating
15. Notification
16. Admin Dashboard
17. Audit Log
18. Realtime Chat/Notification with SignalR if time allows

### 2.2 Must Not Build As Main Scope

Không làm các phần sau thành flow chính:

- Thanh toán thật bằng Stripe/VNPay.
- Rút tiền thật cho Expert.
- Native mobile app API riêng.
- Biometric/KYC verification thật.
- Training AI model riêng.
- Real legal contract signing.
- Video call.
- Fiverr-style Service Marketplace as main flow.

`Services` có thể giữ optional/future enhancement, nhưng không được làm lệch main flow Job/Proposal/Project.

---

## 3. Recommended Backend Stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core Web API |
| ORM | Entity Framework Core |
| Database | SQL Server |
| Auth | JWT Authentication |
| OAuth | Google OAuth 2.0 |
| Authorization | Role-based + Resource-based Authorization |
| Realtime | SignalR |
| API Docs | Swagger/OpenAPI |
| Password Hash | BCrypt hoặc ASP.NET Identity PasswordHasher |
| API Testing | Postman / Swagger |

---

## 4. Architecture Rules

Backend dùng **Layered Architecture**.

```text
Controllers
    ↓
Services
    ↓
Repositories / DbContext
    ↓
SQL Server
```

### 4.1 Folder Structure

```text
AITasker.Api/
├── Controllers/
│   ├── AuthController.cs
│   ├── ProfilesController.cs
│   ├── JobsController.cs
│   ├── RecommendationsController.cs
│   ├── ProposalsController.cs
│   ├── ContractsController.cs
│   ├── ProjectsController.cs
│   ├── MilestonesController.cs
│   ├── DeliverablesController.cs
│   ├── WalletsController.cs
│   ├── EscrowsController.cs
│   ├── TransactionsController.cs
│   ├── MessagesController.cs
│   ├── DisputesController.cs
│   ├── ReviewsController.cs
│   ├── NotificationsController.cs
│   └── AdminController.cs
├── Domain/
│   ├── Entities/
│   ├── Enums/
│   └── Constants/
├── Application/
│   ├── DTOs/
│   │   ├── Requests/
│   │   └── Responses/
│   ├── Interfaces/
│   ├── Services/
│   └── Validators/
├── Infrastructure/
│   ├── Data/
│   ├── Repositories/
│   ├── Auth/
│   ├── AI/
│   ├── Realtime/
│   └── Storage/
├── Middlewares/
├── Hubs/
└── Program.cs
```

### 4.2 Layer Rules

- Controller chỉ nhận request, gọi service, trả response.
- Không viết business logic trực tiếp trong controller.
- Service xử lý nghiệp vụ, validate trạng thái, transaction, permission.
- Repository/DbContext chỉ truy vấn database.
- DTO dùng cho request/response, không trả thẳng Entity nếu có dữ liệu nhạy cảm.
- Entity phải bám sát database script/SRS.
- Các thao tác thay đổi tiền, escrow, milestone, project status phải chạy trong transaction.

---

## 5. Naming Convention

### 5.1 C# Naming

| Type | Convention | Example |
|---|---|---|
| Class | PascalCase | `JobService` |
| Interface | IPascalCase | `IJobService` |
| Method | PascalCase | `CreateJobAsync` |
| Variable | camelCase | `currentUserId` |
| Enum | PascalCase | `ProjectStatus` |
| Async method | suffix Async | `GetJobByIdAsync` |

### 5.2 API Route Naming

Dùng plural noun, lowercase:

```text
/api/auth/login
/api/jobs
/api/jobs/{jobId}
/api/jobs/{jobId}/proposals
/api/proposals/{proposalId}/accept
/api/projects/{projectId}/milestones
/api/milestones/{milestoneId}/deliverables
/api/disputes/{disputeId}/resolve
```

Không đặt route kiểu action tiếng Việt hoặc route quá dài.

---

## 6. Standard API Response

Tất cả API nên trả cùng một format:

```json
{
  "success": true,
  "message": "Created successfully",
  "data": {},
  "errors": []
}
```

Khi lỗi validation:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    "Title is required",
    "BudgetMax must be greater than or equal to BudgetMin"
  ]
}
```

### HTTP Status Rules

| Case | Status |
|---|---:|
| Success GET | 200 |
| Created | 201 |
| No Content | 204 |
| Validation error | 400 |
| Unauthorized | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Conflict status/business rule | 409 |
| Server error | 500 |

---

## 7. Authentication & Authorization Rules

### 7.1 Roles

Supported roles:

```text
CLIENT
EXPERT
ADMIN
```

Account status:

```text
PENDING_ROLE
PENDING_PROFILE
PENDING_AI_REVIEW
ACTIVE
SUSPENDED
BANNED
```

### 7.2 JWT Claims

JWT nên có:

```text
userId
email
fullName
role
status
clientId nullable
expertId nullable
```

### 7.3 Authorization Rules

- Guest chỉ được register/login/view public data.
- Client chỉ tạo/sửa/xóa draft job của chính mình.
- Client chỉ xem proposal của job thuộc mình.
- Expert chỉ submit proposal khi profile approved và user active.
- Expert chỉ submit deliverable cho project mà mình là expert.
- Admin có quyền xem/quản lý tất cả.
- Resource owner check bắt buộc với job, proposal, project, milestone, dispute, review.

---

## 8. Domain Status Rules

### 8.1 Job Status

```text
DRAFT → OPEN → CLOSED
DRAFT → CANCELLED
OPEN → EXPIRED
OPEN → CANCELLED
```

Rules:

- `DRAFT`: Client đang lưu nháp.
- `OPEN`: Expert có thể gửi proposal.
- `CLOSED`: đã chọn proposal/project started.
- `CANCELLED`: Client/Admin hủy.
- `EXPIRED`: quá deadline apply.

### 8.2 Proposal Status

```text
SUBMITTED
COUNTER_OFFERED
ACCEPTED
REJECTED
REJECTED_BY_EXPERT
WITHDRAWN
NOT_SELECTED
```

Rules:

- Một Expert chỉ được gửi một proposal cho một job.
- Chỉ job `OPEN` mới nhận proposal.
- Khi một proposal accepted và escrow locked, các proposal khác chuyển `NOT_SELECTED`.

### 8.3 Contract Status

```text
DRAFT
CONFIRMED
CANCELLED
```

Rules:

- Contract chỉ confirmed khi cả Client và Expert xác nhận.
- Contract phải có scope, final price, timeline, milestones, deliverables, acceptance criteria.

### 8.4 Project Status

```text
PENDING_ESCROW
ACTIVE
COMPLETED
CANCELLED
DISPUTED
```

Rules:

- Contract confirmed → Project `PENDING_ESCROW`.
- Escrow locked → Project `ACTIVE`.
- Open dispute → Project `DISPUTED`.
- All milestones approved/resolved → Project `COMPLETED`.

### 8.5 Milestone Status

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

- Expert submit deliverable → `SUBMITTED`.
- Client approve → `APPROVED` + release escrow.
- Client request revision → `REVISION_REQUESTED` + increase `RevisionUsed`.
- Open dispute → `DISPUTED` + payment frozen.

### 8.6 Escrow Status

```text
PENDING
LOCKED
RELEASED
REFUNDED
FROZEN
```

Rules:

- Không dùng payment thật.
- Mọi payment chỉ là wallet simulation.
- Khi escrow lock: giảm Client `AvailableBalance`, tăng `LockedBalance`.
- Khi release: giảm locked amount, tăng Expert available/earning.
- Khi refund: giảm locked amount, tăng Client available.

---

## 9. Core Business Rules By Module

## 9.1 Auth Module

### Required APIs

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google-login
POST /api/auth/select-role
GET  /api/auth/me
POST /api/auth/refresh-token optional
POST /api/auth/logout optional
```

### Rules

- Email unique.
- Password must be hashed.
- Google login can create account with `AuthProvider = GOOGLE`.
- New account starts as `PENDING_ROLE`.
- After role selected, user completes role-based profile.

---

## 9.2 Profile Module

### Client Profile Required Fields

```text
CompanyName
Industry
BusinessType
AINeeds
MainProblems
ExpectedBudgetMin optional
ExpectedBudgetMax optional
```

### Expert Profile Required Fields

```text
Bio
PortfolioUrl
ExperienceYears
HourlyRate
Skills
```

### Expert Profile Rules

- Expert must be reviewed/scored before applying to jobs.
- ProfileScore range: 1–5.
- Level: `JUNIOR`, `MID`, `SENIOR`.
- ProfileReviewStatus: `PENDING_REVIEW`, `APPROVED`, `REJECTED`.
- For SWP391, AI Profile Checker can be rule-based simulation.

Simple scoring suggestion:

```text
Bio completeness: 20%
Skill relevance: 35%
Portfolio/certificate: 25%
Experience: 20%
```

---

## 9.3 Job Module

### Required APIs

```text
POST /api/jobs
PUT  /api/jobs/{jobId}
POST /api/jobs/{jobId}/submit
GET  /api/jobs
GET  /api/jobs/{jobId}
GET  /api/clients/me/jobs
DELETE /api/jobs/{jobId} optional
```

### Job Validation

- Title required, max 255 characters.
- Description required.
- BudgetMin >= 0.
- BudgetMax >= BudgetMin.
- Deadline must be future date.
- RequiredSkills cannot be empty when submitting job.
- ExpectedDeliverables required when submitting job.

### AI Job Assistant API

```text
POST /api/jobs/ai-suggest
```

Input:

```json
{
  "shortRequirement": "Need Vietnamese chatbot for retail website"
}
```

Output:

```json
{
  "title": "Build Vietnamese AI chatbot for retail website",
  "description": "...",
  "requiredSkills": ["Chatbot", "NLP", "OpenAI API"],
  "budgetMin": 1200,
  "budgetMax": 1800,
  "timelineDays": 30,
  "deliverables": "...",
  "complexity": "MEDIUM"
}
```

---

## 9.4 Recommendation Module

### Required APIs

```text
POST /api/jobs/{jobId}/recommendations/generate
GET  /api/jobs/{jobId}/recommendations
GET  /api/experts/me/recommended-jobs
```

### MatchScore Formula

```text
MatchScore =
50% Skill Match
+ 20% Rating/Profile Score
+ 20% Completed Projects/Experience
+ 10% Budget Fit
```

### Rules

- Only recommend Experts with active account and approved profile.
- Save results into `AIRecommendations`.
- Sort by MatchScore descending.
- If no expert matches, job still remains `OPEN`.

---

## 9.5 Proposal Module

### Required APIs

```text
POST /api/jobs/{jobId}/proposals
GET  /api/jobs/{jobId}/proposals
GET  /api/proposals/{proposalId}
POST /api/proposals/{proposalId}/counter-offer
POST /api/proposals/{proposalId}/expert-response
POST /api/proposals/{proposalId}/accept
POST /api/proposals/{proposalId}/reject
POST /api/proposals/{proposalId}/withdraw
```

### Proposal Validation

- CoverLetter required.
- ProposedPrice >= 0.
- ProposedTimelineDays > 0.
- ExpectedOutputs required.
- WorkingApproach required.
- At least one ProposalMilestone required for medium/complex job.
- Sum of ProposalMilestone.Amount should equal ProposedPrice.

---

## 9.6 Contract Module

### Required APIs

```text
POST /api/proposals/{proposalId}/contract-preview
GET  /api/contracts/{contractId}
POST /api/contracts/{contractId}/client-confirm
POST /api/contracts/{contractId}/expert-confirm
```

### Rules

- Contract preview generated from accepted proposal/counter offer.
- Project is created only when both sides confirm.
- FinalPrice must equal sum of official milestones.
- Store `AcceptanceCriteria` clearly.

---

## 9.7 Project & Milestone Module

### Required APIs

```text
GET /api/projects
GET /api/projects/{projectId}
GET /api/projects/{projectId}/milestones
POST /api/projects/{projectId}/start optional
POST /api/milestones/{milestoneId}/start
```

### Rules

- Project starts after escrow lock.
- Milestone order must be unique in one project.
- Only one active submitted deliverable needs current review per milestone.
- Project completed when all milestones are approved or resolved.

---

## 9.8 Deliverable Module

### Required APIs

```text
POST /api/milestones/{milestoneId}/deliverables
GET  /api/milestones/{milestoneId}/deliverables
POST /api/deliverables/{deliverableId}/approve
POST /api/deliverables/{deliverableId}/request-revision
```

### Rules

- Expert can submit multiple versions.
- VersionNumber must increase by 1.
- Client can approve or request revision.
- RevisionUsed cannot exceed RevisionLimit.
- If RevisionLimit reached, Client must approve or open dispute.

---

## 9.9 Wallet & Escrow Module

### Required APIs

```text
GET  /api/wallets/me
POST /api/wallets/top-up-simulation
POST /api/projects/{projectId}/escrow/lock
POST /api/milestones/{milestoneId}/escrow/release
POST /api/milestones/{milestoneId}/escrow/refund
GET  /api/transactions/me
```

### Transaction Safety Rules

All operations below must use database transaction:

- Escrow lock.
- Escrow release.
- Refund.
- Partial refund.
- Dispute resolution affecting money.

Do not allow negative wallet balance.

---

## 9.10 Dispute Module

### Required APIs

```text
POST /api/milestones/{milestoneId}/disputes
POST /api/disputes/{disputeId}/evidences
GET  /api/disputes/{disputeId}
GET  /api/admin/disputes
POST /api/admin/disputes/{disputeId}/resolve
```

### Rules

- Only Client or Expert in project can open dispute.
- One open dispute per milestone at a time.
- Opening dispute freezes milestone payment.
- Admin decision types:
  - `RELEASE_TO_EXPERT`
  - `REFUND_TO_CLIENT`
  - `PARTIAL_SPLIT`
- Resolution must update dispute, milestone, escrow, wallet, transaction, project status, notification, audit log.

---

## 9.11 Review Module

### Required APIs

```text
POST /api/projects/{projectId}/reviews
GET  /api/users/{userId}/reviews
GET  /api/experts/{expertId}/reviews
POST /api/admin/reviews/{reviewId}/hide
```

### Rules

- Only completed project can be reviewed.
- Client reviews Expert, Expert reviews Client.
- One review per reviewer-reviewee-project.
- Rating must be 1–5.
- Update average rating and review count after saving review.

---

## 9.12 Notification & Chat

### Notification APIs

```text
GET  /api/notifications/me
POST /api/notifications/{notificationId}/read
POST /api/notifications/read-all
```

Notification types:

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

### Chat APIs

```text
GET  /api/projects/{projectId}/messages
POST /api/projects/{projectId}/messages
GET  /api/proposals/{proposalId}/messages
POST /api/proposals/{proposalId}/messages
```

Rules:

- Sender must be project/proposal participant or Admin.
- Message must belong to project, job, or proposal context.

---

## 10. Admin APIs

Required admin APIs:

```text
GET  /api/admin/dashboard
GET  /api/admin/users
POST /api/admin/users/{userId}/suspend
POST /api/admin/users/{userId}/activate
GET  /api/admin/jobs
POST /api/admin/jobs/{jobId}/hide
GET  /api/admin/projects
GET  /api/admin/transactions
GET  /api/admin/disputes
POST /api/admin/disputes/{disputeId}/resolve
GET  /api/admin/reviews
POST /api/admin/reviews/{reviewId}/hide
```

Dashboard should include:

```text
TotalUsers
TotalClients
TotalExperts
TotalJobs
OpenJobs
TotalProposals
TotalProjects
ActiveProjects
CompletedProjects
OpenDisputes
SimulatedReleasedAmount
EscrowLockedAmount
```

---

## 11. Database Rules

- Use SQL Server schema from project database script as source of truth.
- Use decimal for money: `decimal(18,2)`.
- Use UTC time in backend: `DateTime.UtcNow` or `SYSUTCDATETIME()`.
- Add indexes for frequent filters: status, user id, client id, expert id, project id.
- Use unique constraints:
  - Users.Email
  - ExpertSkills(ExpertId, SkillId)
  - JobSkills(JobId, SkillId)
  - Proposals(JobId, ExpertId)
  - ProposalMilestones(ProposalId, OrderIndex)
  - Milestones(ProjectId, OrderIndex)
  - Reviews(ProjectId, ReviewerId, RevieweeId)
- Never delete important business records directly. Prefer status update for jobs, users, reviews.

---

## 12. Validation Checklist

Before saving data, check:

- Required fields are not empty.
- Status transition is valid.
- User role is allowed.
- User owns the resource or is Admin.
- Money amount is non-negative.
- BudgetMin <= BudgetMax.
- Deadline/due date is valid.
- Milestone amount sum equals contract/proposal price.
- RevisionUsed <= RevisionLimit.
- Duplicate proposal/review/skill does not exist.

---

## 13. Error Handling Rules

Use clear error messages:

```text
Job is not open for proposals.
Expert profile is not approved.
You are not allowed to access this project.
Insufficient wallet balance for escrow lock.
Revision limit has been reached.
This milestone already has an open dispute.
```

Do not expose stack trace to frontend.
Log internal exception details server-side.

---

## 14. Swagger Documentation Rules

Every controller action should include:

- Summary.
- Request body schema.
- Response schema.
- Possible status codes.
- Authorization requirement.

Group APIs by module: Auth, Profiles, Jobs, Proposals, Projects, Wallet, Admin.

---

## 15. Seed Data Rules

Use seed data for demo:

- 1 Admin.
- At least 3 Clients.
- At least 5 Experts with different skills.
- Skills: Chatbot, NLP, OpenAI API, Python, Computer Vision, OCR, Data Analytics, Automation, Prompt Engineering, RAG, SQL, Power BI.
- Jobs in different statuses: DRAFT, OPEN, CLOSED.
- Proposals: SUBMITTED, ACCEPTED, NOT_SELECTED.
- Projects: ACTIVE, COMPLETED, DISPUTED.
- Wallet/escrow/transaction examples.
- Review and dispute examples.

---

## 16. Definition of Done For Backend Task

A backend task is done only when:

- API endpoint exists and compiles.
- Request/response DTOs are defined.
- Validation is implemented.
- Authorization is implemented.
- Business status transition is correct.
- Database changes are saved correctly.
- Transaction is used for money/status critical flows.
- Swagger can test endpoint.
- Frontend can consume consistent response format.
- At least one success case and one error case tested.

---

## 17. Backend Coding Priorities

Priority order for SWP391 demo:

1. Auth + role/profile.
2. Job + proposal.
3. Contract + project + milestone.
4. Wallet/escrow simulation.
5. Deliverable + approve/revision.
6. Dispute + review.
7. Recommendation + AI assistant simulation.
8. Admin dashboard.
9. Notification/chat realtime.
10. Optional services.

Always prioritize main flow completeness over extra UI/backend features.
