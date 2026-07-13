using System;

namespace AITasker.Application.DTOs.Requests
{
    public class CreateMilestoneRequest
    {
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ExpectedDeliverable { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int OrderIndex { get; set; }

        public DateTime Deadline { get; set; }
    }
}