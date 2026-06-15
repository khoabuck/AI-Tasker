namespace AITasker.Domain.Constants
{
    public static class NotificationTypes
    {
        // Proposal
        public const string ProposalSubmitted = "PROPOSAL_SUBMITTED";
        public const string ProposalCounterOffer = "PROPOSAL_COUNTER_OFFER";
        public const string ProposalAccepted = "PROPOSAL_ACCEPTED";
        public const string ProposalRejected = "PROPOSAL_REJECTED";
        public const string ProposalWithdrawn = "PROPOSAL_WITHDRAWN";

        // Contract
        public const string ContractDraftCreated = "CONTRACT_DRAFT_CREATED";
        public const string ContractConfirmedByClient = "CONTRACT_CONFIRMED_BY_CLIENT";
        public const string ContractConfirmedByExpert = "CONTRACT_CONFIRMED_BY_EXPERT";
        public const string ContractConfirmed = "CONTRACT_CONFIRMED";

        // Project
        public const string ProjectCreated = "PROJECT_CREATED";
        public const string ProjectStarted = "PROJECT_STARTED";
        public const string ProjectMilestonesInitialized = "PROJECT_MILESTONES_INITIALIZED";
        public const string ProjectCompleted = "PROJECT_COMPLETED";

        // Milestone
        public const string MilestoneCreated = "MILESTONE_CREATED";
        public const string MilestoneUpdated = "MILESTONE_UPDATED";
        public const string MilestoneEscrowLocked = "MILESTONE_ESCROW_LOCKED";

        // Escrow
        public const string EscrowRequestCreated = "ESCROW_REQUEST_CREATED";
        public const string EscrowLocked = "ESCROW_LOCKED";
        public const string EscrowReleased = "ESCROW_RELEASED";
        public const string EscrowRefunded = "ESCROW_REFUNDED";
        public const string EscrowFrozen = "ESCROW_FROZEN";

        // Deliverable
        public const string DeliverableSubmitted = "DELIVERABLE_SUBMITTED";
        public const string DeliverableApproved = "DELIVERABLE_APPROVED";
        public const string RevisionRequested = "REVISION_REQUESTED";

        // Dispute
        public const string DisputeOpened = "DISPUTE_OPENED";
        public const string DisputeEvidenceSubmitted = "DISPUTE_EVIDENCE_SUBMITTED";
        public const string DisputeResolved = "DISPUTE_RESOLVED";

        // Review
        public const string ReviewSubmitted = "REVIEW_SUBMITTED";
        public const string ReviewReceived = "REVIEW_RECEIVED";

        // Wallet / Payment
        public const string WalletDepositSuccess = "WALLET_DEPOSIT_SUCCESS";
        public const string WithdrawalRequested = "WITHDRAWAL_REQUESTED";
        public const string WithdrawalApproved = "WITHDRAWAL_APPROVED";
        public const string WithdrawalRejected = "WITHDRAWAL_REJECTED";

        // Chat
        public const string ChatMessageReceived = "CHAT_MESSAGE_RECEIVED";
        public const string AgreementMarked = "AGREEMENT_MARKED";
    }
}