# 05_FRONTEND_GUIDE.md — Frontend Coding Guide

## Frontend Stack

- ReactJS
- Tailwind CSS
- React Router
- Axios
- React Query
- SignalR client
- Vercel deployment

---

## Recommended Folder Structure

```text
frontend/
├── src/
│   ├── api/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   │   ├── guest/
│   │   ├── auth/
│   │   ├── client/
│   │   ├── expert/
│   │   └── admin/
│   ├── routes/
│   ├── services/
│   ├── signalr/
│   ├── stores/
│   ├── types/
│   └── utils/
```

---

## Environment Variables

Use:

```text
VITE_API_BASE_URL=https://your-backend-url
VITE_SIGNALR_CHAT_HUB_URL=https://your-backend-url/hubs/chat
VITE_SIGNALR_NOTIFICATION_HUB_URL=https://your-backend-url/hubs/notifications
```

Do not hardcode backend URL.

---

## API Client Rules

Create one Axios instance:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});
```

Attach JWT token via interceptor.

Handle standard response:

```ts
type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
};
```

---

## Layout Rules

Use separate layouts:

- GuestLayout
- AuthLayout
- ClientLayout
- ExpertLayout
- AdminLayout

Redirect by role:

- CLIENT -> `/client/dashboard`
- EXPERT -> `/expert/dashboard`
- ADMIN -> `/admin/dashboard`
- PENDING_ROLE -> `/select-role`

---

## Auth Pages

Required pages:

- Home
- Register
- Login
- Google Login button
- Select Role
- Client Type Selection
- Individual Client Profile
- Business Client Profile
- Expert Profile Setup

---

## Client Pages

Required pages:

- Client Dashboard
- Client Profile
- Create Job
- Edit Job Draft
- Job Detail
- Recommended Experts
- Proposal List
- Proposal Detail
- Negotiation Chat
- Contract Preview
- Wallet / Escrow Confirmation
- Project Detail
- Milestone Review
- Dispute Form
- Review Expert

---

## Expert Pages

Required pages:

- Expert Dashboard
- Expert Profile Setup/Edit
- Recommended Jobs
- Browse Jobs
- Job Detail
- Submit Proposal
- Negotiation Chat
- Contract Preview
- Project Detail
- Submit Deliverable
- Dispute Form
- Received Reviews

Expert does not review Client.

---

## Admin Pages

Required pages:

- Admin Dashboard
- User Management
- Business Verification Management
- Job Management
- Project Management
- Transaction Management
- Dispute Management
- Review Management

---

## UI Status Handling

Always show:

- Loading state.
- Empty state.
- Error state.
- Success toast.
- Validation errors.

Use enum/status constants from `docs/07_ENUM_STATUS_RULES.md`.

---

## AI UX Rules

For AI Job Assistant:

- Show input box for short requirement.
- Show loading while calling AI API.
- Show suggested title, description, skills, budget, timeline, deliverables.
- Client can Accept, Edit, Regenerate, or Skip.
- If AI fails, allow manual creation.

For AI Profile Checker:

- Show profile score.
- Show suggested level.
- Show review note.
- If profile not approved, show reason and edit action.

For AI Recommendation:

- Show MatchScore.
- Show match reason.
- Show risk note if exists.

---

## Chat UX Rules

Use SignalR for realtime chat.

Negotiation Chat:

- Room: `proposal-{proposalId}`.
- Shows messages.
- Typing indicator optional.
- Mark as Agreed button for both sides.
- Create Contract button appears only when both sides agreed.

Project Chat:

- Room: `project-{projectId}`.
- Used after project becomes ACTIVE.

---

## Wallet/Escrow UX Rules

- Show project amount.
- Show platform fee.
- Show total client payment.
- Show expert receivable amount.
- Show simulated wallet balance.
- Confirm Escrow button enabled only if balance is enough.
- Payment is simulation; do not show real payment gateway UI.

---

## Review UX Rules

Client:

- Can review Expert only after project COMPLETED.
- Rating 1–5.
- Comment required or recommended depending backend validation.

Expert:

- Can view received reviews.
- Cannot review Client.

---

## Do Not Do

- Do not create pages outside route map unless necessary.
- Do not invent status values.
- Do not call endpoints not in API contract without updating docs.
- Do not show real payment gateway UI.
- Do not show Expert Review Client page.
- Do not hardcode API keys or backend URL.
