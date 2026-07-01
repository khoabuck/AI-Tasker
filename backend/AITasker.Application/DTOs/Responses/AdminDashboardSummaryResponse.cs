namespace AITasker.Application.DTOs.Responses
{
    public class AdminDashboardSummaryResponse
    {
        public DateTime GeneratedAt { get; set; }

        public int TotalUsers { get; set; }

        public int ActiveUsers { get; set; }

        public int PendingRoleUsers { get; set; }

        public int TotalClients { get; set; }

        public int IndividualClients { get; set; }

        public int BusinessClients { get; set; }

        public int TotalExperts { get; set; }

        public int ApprovedExperts { get; set; }

        public int PendingExperts { get; set; }

        public int AvailableExperts { get; set; }

        public int TotalJobs { get; set; }

        public int OpenJobs { get; set; }

        public int DraftJobs { get; set; }
        
        public int ActiveJobs { get; set; }

        public int CompletedJobs { get; set; }

        public int DisputedJobs { get; set; }

        public int CancelledJobs { get; set; }

        public int TotalProposals { get; set; }

        public int SubmittedProposals { get; set; }

        public int AcceptedProposals { get; set; }

        public int RejectedProposals { get; set; }

        public int WithdrawnProposals { get; set; }

        public int TotalContracts { get; set; }

        public int DraftContracts { get; set; }

        public int ConfirmedContracts { get; set; }

        public int TotalProjects { get; set; }

        public int PendingEscrowProjects { get; set; }

        public int ActiveProjects { get; set; }

        public int DisputedProjects { get; set; }

        public int CompletedProjects { get; set; }

        public int TotalMilestones { get; set; }

        public int PendingMilestones { get; set; }

        public int FundedMilestones { get; set; }

        public int SubmittedMilestones { get; set; }

        public int ApprovedMilestones { get; set; }

        public int DisputedMilestones { get; set; }

        public int TotalDisputes { get; set; }

        public int OpenDisputes { get; set; }

        public int ResolvedDisputes { get; set; }

        public int TotalReviews { get; set; }

        public decimal TotalWalletAvailableBalance { get; set; }

        public decimal TotalWalletLockedBalance { get; set; }

        public decimal TotalExpertPendingEarningsBalance { get; set; }

        public decimal TotalExpertEarnings { get; set; }

        public decimal TotalContractValue { get; set; }

        public decimal TotalClientPaymentExpected { get; set; }

        public decimal PlatformFeeExpected { get; set; }

        public decimal PlatformFeeCollected { get; set; }

        public decimal EscrowLockedAmount { get; set; }

        public decimal EscrowFrozenAmount { get; set; }

        public decimal EscrowReleasedAmount { get; set; }

        public decimal EscrowRefundedAmount { get; set; }

        public int PendingWithdrawalCount { get; set; }

        public decimal PendingWithdrawalAmount { get; set; }
    }
}