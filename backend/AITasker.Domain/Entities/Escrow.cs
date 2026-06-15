using System;

namespace AITasker.Domain.Entities
{
    public class Escrow
    {
        public int EscrowId { get; set; }

        public int ProjectId { get; set; }

        public int? MilestoneId { get; set; }

        public int ClientProfileId { get; set; }

        public decimal Amount { get; set; }

        public string Status { get; set; } = "PENDING";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public Project? Project { get; set; }

        public Milestone? Milestone { get; set; }

        public ClientProfile? ClientProfile { get; set; }
    }
}