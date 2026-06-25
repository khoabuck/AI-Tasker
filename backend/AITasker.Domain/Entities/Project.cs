using System;
using System.Collections.Generic;

namespace AITasker.Domain.Entities
{
    public class Project
    {
        public int ProjectId { get; set; }

        public int ContractId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public decimal TotalBudget { get; set; }

        public string Status { get; set; } = "PENDING_ESCROW";

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public DateTime? EscrowLockDeadlineAt { get; set; }

        public DateTime? EscrowLockedAt { get; set; }

        public DateTime? EscrowExpiredAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Milestone> Milestones { get; set; } = new List<Milestone>();
    
        public ProjectContract? Contract { get; set; }
    }
}