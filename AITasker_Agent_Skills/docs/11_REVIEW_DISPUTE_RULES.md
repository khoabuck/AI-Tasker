# 11_REVIEW_DISPUTE_RULES.md — Review and Dispute Rules

## Dispute Rules

### Who Can Open Dispute

Only project participants:

- Project Client.
- Project AI Expert.

Admin does not open disputes for users; Admin resolves disputes.

---

## Dispute Creation Conditions

Dispute can be opened when:

- Project is ACTIVE or in valid execution state.
- Milestone exists and belongs to project.
- No existing open dispute for same milestone/project.
- Reason/evidence information is valid.

---

## Dispute Data

Dispute should include:

- ProjectId
- MilestoneId optional
- OpenedByUserId
- RespondentUserId
- Reason
- Evidence text
- File/image/link proof optional
- DisputedAmount
- Status

Evidence table stores:

- DisputeId
- UploadedByUserId
- EvidenceText
- FileUrl

---

## Dispute Status Flow

```text
OPEN -> UNDER_REVIEW -> RESOLVED
```

When dispute opens:

```text
Project.Status = DISPUTED
Milestone.Status = DISPUTED
Milestone.PaymentStatus = FROZEN
Escrow.Status = FROZEN
```

---

## Admin Review Checklist

Admin should review:

- Project contract.
- Milestone details.
- Deliverable versions.
- Acceptance criteria.
- Chat history.
- Evidence from both sides.
- Escrow transaction history.

---

## Admin Decisions

| Decision | Result |
|---|---|
| RELEASE_TO_EXPERT | Money goes to Expert wallet. |
| REFUND_TO_CLIENT | Money goes back to Client wallet. |
| PARTIAL_SPLIT | Part goes to Expert, part goes to Client. |

After decision:

- Dispute status = RESOLVED.
- Transaction is created.
- Project/milestone status is updated.
- Notification sent to both sides.

---

# Review Rules

## Current Scope

Only Client can review AI Expert.

AI Expert cannot review Client in current scope.

---

## Review Conditions

Review allowed only when:

- Project status = COMPLETED.
- Current user is the project Client.
- Project has no existing review.
- Rating is from 1 to 5.

---

## Review Target

```text
ReviewerId = Project Client UserId
RevieweeId = Project Expert UserId
```

Backend must enforce this. SQL CHECK cannot enforce because it requires join with Projects.

---

## Review Result

After valid review:

- Save review.
- Update ExpertProfiles.RatingAverage.
- Update ExpertProfiles.ReviewCount.
- Show review on public Expert profile if status = VISIBLE.
- Send notification to Expert.

Do not update Client rating.

---

## Admin Review Moderation

Admin can:

- View all reviews.
- Hide violating review.
- Keep valid review visible.

Review status:

```text
VISIBLE
HIDDEN
```

---

## Do Not Do

- Do not create Expert-to-Client review UI.
- Do not update ClientProfiles rating/review count.
- Do not allow review before project completion.
- Do not allow duplicate project review.
