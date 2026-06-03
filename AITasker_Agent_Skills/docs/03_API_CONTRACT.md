# 03_API_CONTRACT.md — API Contract

## Standard Response Format

All APIs should return:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "errors": []
}
```

Error format:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": ["Title is required."]
}
```

---

## Auth API

### POST `/api/auth/register`

Request:

```json
{
  "email": "client@example.com",
  "password": "Password123!",
  "fullName": "Nguyen Van A"
}
```

Response data:

```json
{
  "userId": 1,
  "email": "client@example.com",
  "fullName": "Nguyen Van A",
  "status": "PENDING_ROLE"
}
```

### POST `/api/auth/login`

Request:

```json
{
  "email": "client@example.com",
  "password": "Password123!"
}
```

Response data:

```json
{
  "accessToken": "jwt-token",
  "user": {
    "userId": 1,
    "email": "client@example.com",
    "fullName": "Nguyen Van A",
    "role": "CLIENT",
    "status": "ACTIVE"
  }
}
```

### POST `/api/auth/google-login`

Request:

```json
{
  "idToken": "google-id-token"
}
```

Response data: same as login.

### POST `/api/users/select-role`

Request:

```json
{
  "role": "CLIENT"
}
```

Rules:

- Role must be CLIENT or EXPERT.
- ADMIN is not selectable by normal user.

---

## Client Profile API

### POST `/api/clients/select-type`

Request:

```json
{
  "clientType": "INDIVIDUAL"
}
```

### POST `/api/clients/individual-profile`

Request:

```json
{
  "phoneNumber": "0900000000",
  "aiNeeds": "Need chatbot automation",
  "mainProblems": "Manual customer support takes too much time",
  "expectedBudgetMin": 500,
  "expectedBudgetMax": 1500
}
```

System behavior:

- Set ClientType = INDIVIDUAL.
- Set BusinessVerificationStatus = NOT_REQUIRED.
- Set PlatformFeeRate = 5.00.
- Set account status = ACTIVE if valid.

### POST `/api/clients/business-profile`

Request:

```json
{
  "companyName": "ABC Company",
  "taxCode": "0312345678",
  "industry": "Retail",
  "companyAddress": "Ho Chi Minh City",
  "phoneNumber": "0900000000",
  "aiNeeds": "Need AI workflow automation",
  "mainProblems": "Manual operations",
  "expectedBudgetMin": 2000,
  "expectedBudgetMax": 10000
}
```

System behavior:

- Set ClientType = BUSINESS.
- Set PlatformFeeRate = 10.00.
- Set BusinessVerificationStatus = VERIFIED or PENDING_REVIEW based on team rule.

### GET `/api/clients/me`

Returns current Client profile.

---

## Expert Profile API

### POST `/api/experts/profile`

Request:

```json
{
  "bio": "AI engineer with chatbot and RAG experience",
  "portfolioUrl": "https://portfolio.example.com",
  "certificateUrl": "https://cert.example.com",
  "experienceYears": 2,
  "hourlyRate": 25,
  "skills": [
    { "skillId": 1, "skillLevel": "ADVANCED", "yearsOfExperience": 2 }
  ]
}
```

### POST `/api/experts/profile/check-ai`

Behavior:

- Calls Gemini/DeepSeek API.
- Stores AIRequestLogs.
- Updates ExpertProfiles ProfileScore, Level, ProfileReviewStatus, ProfileReviewNote.

Response data:

```json
{
  "profileScore": 82,
  "level": "MID",
  "profileReviewStatus": "APPROVED",
  "reviewNote": "Profile is clear and portfolio is relevant."
}
```

### GET `/api/experts/me`

Returns current Expert profile.

---

## Job API

### POST `/api/jobs/ai-suggest`

Request:

```json
{
  "shortRequirement": "I need a Vietnamese chatbot for my website to answer customer FAQs"
}
```

Response data:

```json
{
  "title": "Vietnamese AI Chatbot for Customer Support",
  "description": "Build a chatbot that answers FAQs and supports customer consultation.",
  "requiredSkills": ["Chatbot", "NLP", "Gemini API"],
  "budgetMin": 500,
  "budgetMax": 1500,
  "timelineDays": 30,
  "expectedDeliverables": "Chatbot demo, API integration, documentation, test cases",
  "complexity": "MEDIUM"
}
```

### POST `/api/jobs`

Creates job draft.

Request:

```json
{
  "title": "Vietnamese AI Chatbot",
  "description": "Build chatbot for FAQ support",
  "budgetMin": 500,
  "budgetMax": 1500,
  "deadline": "2026-08-01T00:00:00",
  "projectType": "CHATBOT",
  "complexity": "MEDIUM",
  "expectedDeliverables": "Demo, source code, documentation",
  "isAIAssisted": true,
  "skillIds": [1, 2, 3]
}
```

### PUT `/api/jobs/{jobId}`

Updates draft job owned by Client.

### POST `/api/jobs/{jobId}/submit`

Validates job and sets status = OPEN.

### GET `/api/jobs`

Query params:

- status
- skillId
- budgetMin
- budgetMax
- complexity
- projectType

### GET `/api/jobs/{jobId}`

Returns job detail.

### GET `/api/clients/me/jobs`

Returns current Client jobs.

---

## Recommendation API

### POST `/api/jobs/{jobId}/recommendations/generate`

Behavior:

- Requires job status = OPEN.
- Gets active/approved Experts.
- Calls AI Expert Recommendation Module.
- Saves AIRecommendations.

Response data:

```json
[
  {
    "expertId": 10,
    "matchScore": 88,
    "matchReason": "Strong chatbot and NLP experience",
    "riskNote": "Budget slightly below Expert hourly rate"
  }
]
```

### GET `/api/jobs/{jobId}/recommendations`

Client views recommended Experts for a job.

### GET `/api/experts/me/recommended-jobs`

Expert views recommended jobs.

---

## Proposal API

### POST `/api/jobs/{jobId}/proposals`

Request:

```json
{
  "coverLetter": "I have built similar AI chatbots before.",
  "proposedPrice": 1200,
  "proposedTimelineDays": 30,
  "expectedOutputs": "Chatbot demo, source code, API docs",
  "workingApproach": "Requirement analysis, prototype, integration, testing",
  "preliminaryMilestonePlan": "M1 prototype, M2 integration, M3 testing"
}
```

Rules:

- Job must be OPEN.
- Expert must be APPROVED.
- One proposal per Expert per job.

### GET `/api/jobs/{jobId}/proposals`

Client views proposals of owned job.

### GET `/api/proposals/{proposalId}`

Proposal detail.

### POST `/api/proposals/{proposalId}/counter-offer`

Request:

```json
{
  "counterPrice": 1000,
  "counterTimelineDays": 25,
  "counterMessage": "Can you reduce timeline and focus on FAQ first?"
}
```

### POST `/api/proposals/{proposalId}/accept`

Can be used for direct accept path. In full flow, still requires contract confirmation and escrow.

### POST `/api/proposals/{proposalId}/reject`

Reject proposal.

---

## Chat and SignalR API

### GET `/api/proposals/{proposalId}/messages`

Returns negotiation messages.

### POST `/api/proposals/{proposalId}/messages`

Stores a message and broadcasts through SignalR.

Request:

```json
{
  "messageText": "Can we split this into 3 milestones?",
  "messageType": "TEXT"
}
```

### POST `/api/proposals/{proposalId}/agreement/mark`

Request:

```json
{
  "isAgreed": true
}
```

Behavior:

- Marks current user's agreement in proposal negotiation.
- If both sides agreed, Create Contract button can be enabled.

---

## Contract API

### POST `/api/proposals/{proposalId}/contract-from-chat`

Behavior:

- Requires both sides Mark as Agreed.
- Sends proposal data, counter offer data, chat summary to AI Contract Draft Assistant.
- Creates ProjectContract status = DRAFT.

Response data:

```json
{
  "contractId": 100,
  "status": "DRAFT",
  "finalPrice": 1200,
  "platformFeeRate": 5,
  "platformFeeAmount": 60,
  "totalClientPayment": 1260,
  "expertReceivableAmount": 1200
}
```

### GET `/api/contracts/{contractId}`

Returns contract preview.

### POST `/api/contracts/{contractId}/confirm`

Current user confirms contract.

Behavior:

- If Client confirms, sets ClientConfirmed = true.
- If Expert confirms, sets ExpertConfirmed = true.
- If both confirmed, ProjectContract status = CONFIRMED and Project status = PENDING_ESCROW.

---

## Wallet / Escrow API

### GET `/api/wallets/me`

Returns current user's simulated wallet.

### POST `/api/wallets/me/top-up-simulation`

Request:

```json
{
  "amount": 5000
}
```

Simulation only.

### POST `/api/projects/{projectId}/escrow/confirm`

Behavior:

- Checks Client wallet available balance.
- Deducts total client payment.
- Locks project/milestone amount in escrow.
- Records platform fee as simulated revenue.
- Project status = ACTIVE.

### GET `/api/projects/{projectId}/transactions`

Returns transaction history.

---

## Project / Milestone / Deliverable API

### GET `/api/projects/{projectId}`

Project detail.

### GET `/api/projects/me`

Current user's projects.

### GET `/api/projects/{projectId}/milestones`

Project milestones.

### POST `/api/milestones/{milestoneId}/deliverables`

Expert submits deliverable.

Request:

```json
{
  "fileUrl": "https://file.example.com",
  "demoUrl": "https://demo.example.com",
  "description": "Milestone 1 chatbot prototype",
  "handoverNotes": "Please test the demo account."
}
```

### POST `/api/deliverables/{deliverableId}/approve`

Client approves deliverable.

### POST `/api/deliverables/{deliverableId}/revision`

Request:

```json
{
  "feedback": "Please improve Vietnamese responses."
}
```

---

## Dispute API

### POST `/api/disputes`

Request:

```json
{
  "projectId": 1,
  "milestoneId": 2,
  "reason": "Deliverable does not meet agreed criteria",
  "evidenceText": "Chatbot cannot answer required FAQ set.",
  "fileUrl": "https://evidence.example.com"
}
```

### GET `/api/admin/disputes`

Admin dispute dashboard.

### GET `/api/admin/disputes/{disputeId}`

Dispute detail.

### POST `/api/admin/disputes/{disputeId}/resolve`

Request:

```json
{
  "resolutionType": "PARTIAL_SPLIT",
  "releaseAmount": 600,
  "refundAmount": 400,
  "adminDecision": "Both sides partially fulfilled obligations."
}
```

Resolution types:

- RELEASE_TO_EXPERT
- REFUND_TO_CLIENT
- PARTIAL_SPLIT

---

## Review API

### POST `/api/projects/{projectId}/reviews`

Client reviews Expert.

Request:

```json
{
  "rating": 5,
  "comment": "Good quality, good communication, delivered on time."
}
```

Rules:

- Only project Client can call.
- Project status must be COMPLETED.
- One review per project.
- Reviewee is the project Expert.

### GET `/api/experts/{expertId}/reviews`

Public Expert reviews.

### GET `/api/experts/me/reviews`

Expert views received reviews.

### POST `/api/admin/reviews/{reviewId}/hide`

Admin hides violating review.

---

## Admin API

### GET `/api/admin/dashboard`

Returns statistics.

### GET `/api/admin/users`

List users.

### POST `/api/admin/users/{userId}/suspend`

Suspend user by setting `Users.Status = SUSPENDED`.

### POST `/api/admin/users/{userId}/activate`

Activate user by setting `Users.Status = ACTIVE` when the user's role/profile requirements are valid.

Do not use `LOCKED` as a user status because SQL uses `SUSPENDED`.

### GET `/api/admin/jobs`

List jobs.

### GET `/api/admin/projects`

List projects.

### GET `/api/admin/transactions`

List simulated transactions.

---

## Health API

### GET `/api/health`

Response:

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
