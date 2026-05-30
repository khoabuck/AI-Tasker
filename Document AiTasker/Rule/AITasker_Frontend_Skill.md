# AITasker Frontend Skill Guide

> Dùng file này làm rule/skill guide cho frontend team khi code Project SWP391 AITasker.
> Frontend phải bám sát SRS: AITasker là AI freelance marketplace theo hướng Upwork-like, tập trung vào trải nghiệm Guest, Client, AI Expert và Admin.

---

## 1. Frontend Role

Bạn là Frontend Developer cho hệ thống **AITasker — AI Marketplace Platform for AI Automation Services**.
Nhiệm vụ chính là xây dựng giao diện web rõ ràng, responsive, đúng role, đúng flow nghiệp vụ, gọi API backend chuẩn, xử lý loading/error/empty state và hỗ trợ demo mượt cho SWP391.

Frontend không được tự ý đổi nghiệp vụ. UI phải đi theo main flow:

```text
Register/Login
→ Role Profile
→ Client posts AI Job
→ AI suggests job content
→ Expert sees recommended/browse jobs
→ Expert submits proposal
→ Client negotiates/accepts
→ Contract confirmation
→ Escrow simulation
→ Milestone deliverable
→ Approve/Revision/Dispute
→ Complete project
→ Review & Rating
```

---

## 2. Project Scope Rules

### 2.1 Must Build Screens

Frontend phải có các nhóm màn hình:

1. Guest pages
2. Auth pages
3. Role selection
4. Client onboarding/profile
5. Expert onboarding/profile
6. Client dashboard
7. Expert dashboard
8. Admin dashboard
9. Job creation + AI Job Assistant
10. Job detail
11. Recommended Experts
12. Recommended Jobs / Browse Jobs
13. Proposal form + proposal detail
14. Negotiation/counter offer/chat
15. Contract preview/confirmation
16. Wallet/escrow simulation
17. Project detail
18. Milestone detail
19. Deliverable submission/review
20. Dispute/evidence
21. Review/rating
22. Notifications

### 2.2 Must Not Prioritize

Không ưu tiên làm các phần sau nếu main flow chưa xong:

- Native mobile layout riêng.
- Payment thật.
- Video call.
- Fiverr-style service marketplace full flow.
- AI model training UI.
- Complex analytics chart quá sâu.

---

## 3. Recommended Frontend Stack

| Area | Technology |
|---|---|
| UI Framework | ReactJS |
| Styling | Tailwind CSS |
| Routing | React Router |
| API Client | Axios |
| Server State | React Query |
| Form | React Hook Form recommended |
| Validation | Zod/Yup recommended |
| Realtime | SignalR client optional |
| Icons | lucide-react / react-icons optional |
| Notification Toast | react-hot-toast / sonner optional |

---

## 4. Folder Structure

```text
src/
├── app/
│   ├── App.jsx
│   ├── router.jsx
│   └── providers.jsx
├── assets/
├── components/
│   ├── common/
│   ├── layout/
│   ├── forms/
│   ├── cards/
│   ├── tables/
│   ├── modals/
│   ├── status/
│   └── guards/
├── features/
│   ├── auth/
│   ├── profiles/
│   ├── jobs/
│   ├── recommendations/
│   ├── proposals/
│   ├── contracts/
│   ├── projects/
│   ├── milestones/
│   ├── deliverables/
│   ├── wallet/
│   ├── disputes/
│   ├── reviews/
│   ├── notifications/
│   └── admin/
├── hooks/
├── lib/
│   ├── axiosClient.js
│   ├── queryClient.js
│   ├── auth.js
│   ├── constants.js
│   └── formatters.js
├── pages/
│   ├── guest/
│   ├── auth/
│   ├── client/
│   ├── expert/
│   └── admin/
└── styles/
```

### Folder Rules

- Shared UI goes to `components/`.
- Business-specific UI goes to `features/{module}/`.
- API functions stay close to feature: `features/jobs/jobApi.js`.
- Pages only compose components and call hooks.
- Do not put long API logic directly inside page components.

---

## 5. Naming Convention

| Item | Convention | Example |
|---|---|---|
| Component | PascalCase | `JobCard.jsx` |
| Hook | camelCase starts with use | `useJobs.js` |
| API file | camelCase + Api | `jobApi.js` |
| Constants | UPPER_SNAKE_CASE | `PROJECT_STATUS` |
| CSS class helper | camelCase | `getStatusBadgeClass` |
| Route path | lowercase kebab | `/client/post-job` |

---

## 6. UI Design Rules

### 6.1 Visual Style

AITasker UI nên tạo cảm giác:

- Professional.
- Clean.
- Trustworthy.
- Tech/AI-oriented.
- Easy for non-technical Client.
- Clear for Expert to find work.

### 6.2 Layout Rules

- Dùng responsive layout cho desktop/tablet/mobile.
- Dashboard dùng card + table + filter.
- Form dài chia section, không dồn một màn hình quá rối.
- Project detail nên dùng tabs:
  - Overview
  - Milestones
  - Deliverables
  - Chat
  - Payment
  - Disputes
  - Reviews
- Admin pages ưu tiên table + filter + detail drawer/modal.

### 6.3 Common Components

Tạo reusable components:

```text
Button
Input
Textarea
Select
Badge
StatusBadge
Modal
ConfirmDialog
LoadingSpinner
EmptyState
ErrorState
Pagination
DataTable
UserAvatar
SkillTag
RatingStars
MoneyText
DateText
Timeline
MilestoneStepper
```

---

## 7. Routing Rules

### 7.1 Public Routes

```text
/
/login
/register
/auth/google-callback
```

### 7.2 Onboarding Routes

```text
/select-role
/onboarding/client-profile
/onboarding/expert-profile
```

### 7.3 Client Routes

```text
/client/dashboard
/client/profile
/client/jobs
/client/jobs/new
/client/jobs/:jobId
/client/jobs/:jobId/proposals
/client/recommended-experts/:jobId
/client/projects
/client/projects/:projectId
/client/wallet
/client/transactions
/client/reviews
```

### 7.4 Expert Routes

```text
/expert/dashboard
/expert/profile
/expert/recommended-jobs
/expert/jobs
/expert/jobs/:jobId
/expert/jobs/:jobId/proposal/new
/expert/proposals
/expert/projects
/expert/projects/:projectId
/expert/wallet
/expert/earnings
/expert/reviews
```

### 7.5 Admin Routes

```text
/admin/dashboard
/admin/users
/admin/jobs
/admin/proposals
/admin/projects
/admin/transactions
/admin/disputes
/admin/reviews
```

### 7.6 Guard Rules

- `GuestRoute`: redirect logged-in user to dashboard.
- `ProtectedRoute`: requires token.
- `RoleRoute`: requires specific role.
- `ProfileCompleteRoute`: requires profile completed/approved.
- Expert with profile not approved cannot access proposal submission.
- Suspended/banned users should see blocked page.

---

## 8. Auth UI Rules

### Required Screens

- Login.
- Register.
- Continue with Google button.
- Role selection: Client / AI Expert.
- Client profile form.
- Expert profile form.

### Auth State Rules

Store:

```text
token
userId
email
fullName
role
status
clientId
expertId
```

Use token in Axios Authorization header:

```text
Authorization: Bearer {token}
```

After login:

| User State | Redirect |
|---|---|
| PENDING_ROLE | `/select-role` |
| CLIENT active | `/client/dashboard` |
| EXPERT active + approved | `/expert/dashboard` |
| EXPERT pending review | `/expert/profile?status=pending-review` |
| ADMIN | `/admin/dashboard` |

---

## 9. API Integration Rules

### 9.1 Axios Client

Create one shared Axios instance:

```text
baseURL from environment variable
attach JWT token automatically
handle 401 by logout/redirect
normalize error message
```

### 9.2 React Query Rules

Use React Query for server state:

- `useQuery` for GET.
- `useMutation` for POST/PUT/DELETE.
- Invalidate related queries after mutation.
- Do not duplicate backend data in local state unless needed for form draft.

Example query keys:

```text
['me']
['jobs']
['job', jobId]
['job-proposals', jobId]
['project', projectId]
['milestones', projectId]
['notifications']
['admin-dashboard']
```

### 9.3 Standard API Response Handling

Backend returns:

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "errors": []
}
```

Frontend must:

- Use `response.data.data` as payload.
- Show `message` on success toast when useful.
- Show `errors` or `message` on error toast.
- Always handle loading, empty, and error states.

---

## 10. Role-based UI Rules

### 10.1 Guest

Guest can:

- View landing page.
- View public explanation of AITasker.
- Register/login.

Guest cannot:

- Submit proposal.
- Post job.
- View private project/payment/chat data.

### 10.2 Client

Client can:

- Create/edit draft job.
- Use AI Job Assistant.
- Submit job.
- View recommended experts.
- View proposals for own jobs.
- Accept/reject/counter proposal.
- Confirm contract.
- Confirm escrow.
- Review deliverable.
- Approve/request revision/open dispute.
- Review Expert.

### 10.3 Expert

Expert can:

- Create expert profile.
- View recommended jobs.
- Browse open jobs.
- Submit proposal.
- Respond to counter offer.
- Confirm contract.
- Submit deliverable.
- Open dispute.
- Review Client.

Expert cannot:

- Submit proposal if profile is not approved.
- Approve own deliverable.
- Access other expert project data.

### 10.4 Admin

Admin can:

- Manage users.
- View jobs/proposals/projects.
- Resolve disputes.
- View transactions.
- Hide reviews.
- View dashboard statistics.

---

## 11. Page Rules By Flow

## 11.1 Client Post Job Page

### Sections

1. Basic information.
2. AI Job Assistant.
3. Budget and timeline.
4. Required skills.
5. Expected deliverables.
6. Preview and submit.

### Required Actions

```text
Save Draft
Use AI Suggestion
Regenerate Suggestion
Submit Job
Cancel
```

### Validation

- Title required.
- Description required.
- Budget min/max valid.
- Deadline required.
- At least one skill required when submitting.
- Expected deliverables required.

---

## 11.2 Recommended Experts Page

Display for each Expert:

```text
Avatar / Name
Level
Rating average
Completed projects
Hourly rate
Skill tags
MatchScore
Match reason
View profile button
Invite/message optional
```

Sort by MatchScore descending.

---

## 11.3 Browse Jobs / Recommended Jobs Page

Display for each job:

```text
Title
Company name
Budget range
Deadline
Project type
Complexity
Required skills
AI-assisted badge
MatchScore optional for recommended jobs
View detail button
Submit proposal button
```

Filters:

```text
Skill
Budget
Deadline
Project type
Complexity
Status OPEN only
```

---

## 11.4 Proposal Form

Fields:

```text
Cover letter
Proposed price
Proposed timeline days
Expected outputs
Working approach
```

Validation:

- Timeline must be positive.
- Milestone plan is NOT required during Proposal phase (Milestones are negotiated and created directly inside the Project Contract during Flow 5/6).

---

## 11.5 Proposal Detail / Negotiation Page

Client view should show:

```text
Expert profile summary
Cover letter
Price/timeline
Expected outputs
Working approach
Counter offer area
Accept / Reject / Counter Offer buttons
Chat panel
```

Expert view should show:

```text
Proposal status
Client counter offer
Accept counter / Reject / Suggest adjustment
Chat panel
```

---

## 11.6 Contract Preview Page

Show:

```text
Project scope
Final price
Final timeline
Milestones
Deliverables
Revision limit
Payment terms
Acceptance criteria
Client confirmation status
Expert confirmation status
```

Actions:

```text
Confirm Contract
Request Change optional
Cancel optional
```

Project only moves forward after both sides confirm.

---

## 11.7 Wallet/Escrow Page

Client wallet should show:

```text
Available balance
Locked balance
Project escrow requests
Confirm escrow button
Transaction history
```

Expert wallet should show:

```text
Available balance
Total earning
Released payment history
Pending milestone payments
```

Important UI message:

```text
Payment in this SWP391 project is simulated. No real money is processed.
```

---

## 11.8 Project Detail Page

Use tabs:

```text
Overview
Milestones
Deliverables
Chat
Payment
Dispute
Review
```

Header should show:

```text
Project title/scope
Client/Expert name
Project status
Escrow status
Total amount
Start date
End date optional
```

---

## 11.9 Milestone Review Page For Client

Show:

```text
Milestone information
Amount
Due date
Revision limit/used
Current deliverable version
File/demo links
Description
Notes
```

Actions:

```text
Approve Deliverable
Request Revision
Open Dispute
```

If revision limit reached, disable revision and show message.

---

## 11.10 Deliverable Submission Page For Expert

Fields:

```text
File URL optional
Demo URL optional
Description
Notes optional
```

Rules:

- Show next version number.
- Show previous feedback if revision requested.
- Disable submit if milestone is approved/disputed/cancelled.

---

## 11.11 Dispute Page

Open dispute form:

```text
Reason
Evidence text
File/image/link proof optional
```

Dispute detail:

```text
Status
Opened by
Respondent
Milestone
Disputed amount
Evidence list
Admin decision if resolved
```

Admin dispute resolution UI:

```text
Release money to Expert
Refund money to Client
Partial split
Admin decision note
```

---

## 11.12 Review Page

Review form:

```text
Rating 1–5
Comment
```

Rules:

- Only completed projects show review form.
- Each side reviews once.
- After submit, show submitted review card.

---

## 12. Status Badge Rules

Create one `StatusBadge` component.

### Job Status

```text
DRAFT
OPEN
CLOSED
CANCELLED
EXPIRED
```

### Proposal Status

```text
SUBMITTED
COUNTER_OFFERED
ACCEPTED
REJECTED
REJECTED_BY_EXPERT
WITHDRAWN
NOT_SELECTED
```

### Project Status

```text
PENDING_ESCROW
ACTIVE
COMPLETED
CANCELLED
DISPUTED
```

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

### Escrow Status

```text
NOT_LOCKED
LOCKED
PARTIALLY_RELEASED
RELEASED
REFUNDED
FROZEN
```

Do not hardcode status text in many places. Use constants.

---

## 13. Form UX Rules

- Show inline validation message below field.
- Disable submit button while loading.
- Preserve form data if API fails.
- Use confirm dialog for destructive/important actions:
  - Accept proposal.
  - Confirm contract.
  - Confirm escrow.
  - Approve deliverable.
  - Open dispute.
  - Resolve dispute.
- Use textarea for description/scope/comment fields.
- Use select/multiselect for skills/status/complexity.

---

## 14. Loading, Empty, Error Rules

Every page that calls API must include:

### Loading State

```text
Skeleton/card spinner/table shimmer
```

### Empty State

Examples:

```text
No proposals yet.
No recommended experts found for this job.
No open jobs match your skills.
No transactions yet.
```

### Error State

Show readable message and retry button.

---

## 15. Data Formatting Rules

Create format helper functions:

```text
formatMoney(amount) → "$1,200.00" or "1,200 USD"
formatDate(date) → "27/05/2026"
formatDateTime(date) → "27/05/2026 09:10"
formatRating(rating) → "4.8"
formatStatus(status) → user-friendly label
```

Use consistent money/date formatting in all pages.

---

## 16. Environment Variables

Use `.env`:

```text
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SIGNALR_URL=http://localhost:5000/hubs
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Do not hardcode backend URL in components.

---

## 17. Frontend API Modules

Create API files:

```text
features/auth/authApi.js
features/profiles/profileApi.js
features/jobs/jobApi.js
features/recommendations/recommendationApi.js
features/proposals/proposalApi.js
features/contracts/contractApi.js
features/projects/projectApi.js
features/milestones/milestoneApi.js
features/deliverables/deliverableApi.js
features/wallet/walletApi.js
features/disputes/disputeApi.js
features/reviews/reviewApi.js
features/notifications/notificationApi.js
features/admin/adminApi.js
```

Each API file should export functions only, not components.

---

## 18. Recommended Hook Pattern

Example:

```text
useJobs(filters)
useJob(jobId)
useCreateJob()
useSubmitJob()
useJobProposals(jobId)
useSubmitProposal(jobId)
useProject(projectId)
useProjectMilestones(projectId)
useSubmitDeliverable(milestoneId)
useApproveDeliverable()
useOpenDispute()
useAdminDashboard()
```

Hooks should wrap React Query logic and hide API details from pages.

---

## 19. Dashboard Rules

### Client Dashboard Cards

```text
My Jobs
Open Jobs
Proposals Received
Active Projects
Pending Deliverables Review
Wallet Balance
```

### Expert Dashboard Cards

```text
Recommended Jobs
Submitted Proposals
Active Projects
Pending Deliverables
Total Earning
Average Rating
```

### Admin Dashboard Cards

```text
Total Users
Total Clients
Total Experts
Total Jobs
Open Jobs
Total Proposals
Active Projects
Completed Projects
Open Disputes
Escrow Locked Amount
Simulated Released Amount
```

---

## 20. Accessibility & UX Rules

- Buttons must have clear labels.
- Inputs must have labels.
- Do not rely only on color to indicate status.
- Modals must be closable.
- Tables should be readable on smaller screens using horizontal scroll or card layout.
- Toast messages should not hide important validation errors.

---

## 21. Security-related Frontend Rules

Frontend is not the source of security truth, but must still:

- Hide UI actions user cannot perform.
- Never show password/token in UI.
- Store token carefully; localStorage is okay for demo, but keep code isolated in auth helper.
- Remove token on logout/401.
- Do not trust frontend validation only; backend must validate too.
- Do not expose admin routes to non-admin in sidebar.

---

## 22. Demo-first Development Priority

Frontend priority order:

1. Auth + role/profile onboarding.
2. Client post job with AI suggestion UI.
3. Expert browse/recommended jobs and submit proposal.
4. Client proposal list/detail and accept/counter.
5. Contract preview and confirmation.
6. Wallet/escrow simulation UI.
7. Project/milestone/deliverable flow.
8. Approve/revision/dispute flow.
9. Review/rating.
10. Admin dashboard and dispute resolution.
11. Notification/chat realtime.
12. Optional services.

Always finish a complete end-to-end flow before polishing optional pages.

---

## 23. Definition of Done For Frontend Task

A frontend task is done only when:

- Page/component matches SRS flow.
- Correct role can access it.
- API integration works.
- Loading state exists.
- Empty state exists.
- Error state exists.
- Form validation exists.
- Success/error toast exists for mutations.
- UI is responsive enough for demo.
- Important actions have confirm dialog.
- Data uses shared formatters/constants.
- No hardcoded backend URLs.

---

## 24. Frontend Coding Rules

- Keep components small.
- Do not duplicate status strings everywhere.
- Do not put API calls directly in JSX event handlers if it gets complex.
- Use feature folders for business modules.
- Use reusable cards/tables/forms.
- Keep role-specific sidebars separate or config-based.
- Keep Vietnamese labels acceptable for demo, but code names should remain English.
- Prefer clear UI over fancy animation.
- Do not build extra marketplace features before main flow is complete.
