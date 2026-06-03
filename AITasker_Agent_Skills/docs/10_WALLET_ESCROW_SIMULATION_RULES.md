# 10_WALLET_ESCROW_SIMULATION_RULES.md — Wallet/Escrow Simulation Rules

## Goal

AITasker currently uses wallet-based escrow simulation only. It does not process real money.

---

## Out of Scope

Do not implement:

- Stripe production payment.
- VNPay production payment.
- MoMo production payment.
- Real payment webhooks.
- Real payout/withdrawal to Expert.
- Bank account integration.
- Card payment UI.

---

## Core Formula

```text
PlatformFee = FinalContractPrice * PlatformFeeRate / 100
TotalClientPayment = FinalContractPrice + PlatformFee
ExpertReceivableAmount = FinalContractPrice
```

PlatformFeeRate:

```text
INDIVIDUAL = 5%
BUSINESS = 10%
```

---

## Escrow Lock Flow

1. Contract status = CONFIRMED.
2. Project status = PENDING_ESCROW.
3. System calculates total client payment.
4. Client confirms escrow.
5. System checks Client simulated wallet balance.
6. If balance insufficient, show error/top-up simulation.
7. If balance sufficient:
   - Deduct Client available balance by total client payment.
   - Lock project/milestone amount in escrow.
   - Record platform fee as simulated platform revenue.
   - Create ESCROW_LOCK transaction.
   - Set project status = ACTIVE.
   - Set escrow status = LOCKED.
   - Set proposal status = ACCEPTED.
   - Set job status = CLOSED.
   - Set other proposals = NOT_SELECTED.

---

## Escrow Release Flow

1. Expert submits deliverable.
2. Client approves deliverable.
3. Milestone status = APPROVED.
4. Escrow releases milestone amount to Expert wallet.
5. Expert available balance increases.
6. Expert total earning increases.
7. Create ESCROW_RELEASE transaction.

---

## Revision Flow

1. Client requests revision.
2. System checks revision limit.
3. If remaining revision count:
   - Milestone status = REVISION_REQUESTED.
   - RevisionUsed increases by 1.
   - Expert submits new deliverable version.
4. If revision limit exceeded:
   - Client must Approve or Open Dispute.

---

## Dispute Freeze Flow

1. Client or Expert opens dispute.
2. Project status = DISPUTED.
3. Milestone status = DISPUTED.
4. Milestone payment status = FROZEN.
5. Escrow status = FROZEN for disputed amount.
6. Admin resolves dispute.

---

## Admin Resolution Options

| Resolution | Behavior |
|---|---|
| RELEASE_TO_EXPERT | Release disputed escrow amount to Expert wallet. |
| REFUND_TO_CLIENT | Refund disputed escrow amount to Client wallet. |
| PARTIAL_SPLIT | Release part to Expert and refund part to Client. |

Transaction types:

- ESCROW_RELEASE
- REFUND
- PARTIAL_REFUND

---

## Database Transaction Requirement

Use database transaction for:

- Wallet balance update.
- Escrow status update.
- PaymentTransactions insert.
- Project/Milestone status update.

If any step fails, rollback all.

---

## Important Rules

| Rule | Description |
|---|---|
| WES-01 | Expert does not receive platform fee. |
| WES-02 | Platform fee is simulated platform revenue. |
| WES-03 | Project cannot become ACTIVE without escrow lock. |
| WES-04 | Money cannot be released if milestone is not APPROVED or resolved by Admin. |
| WES-05 | Money cannot be released while payment status = FROZEN. |
| WES-06 | Payment gateway is future enhancement only. |
