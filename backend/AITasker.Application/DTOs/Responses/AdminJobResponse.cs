namespace AITasker.Application.DTOs.Responses;

public class AdminJobResponse
{
    public int JobPostingId { get; set; }

    public int ClientProfileId { get; set; }

    public int ClientUserId { get; set; }

    public string ClientName { get; set; } = string.Empty;

    public string ClientEmail { get; set; } = string.Empty;

    public string ClientType { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? AiGeneratedDescription { get; set; }

    public decimal BudgetMin { get; set; }

    public decimal BudgetMax { get; set; }

    public DateTime Deadline { get; set; }

    public string ProjectType { get; set; } = string.Empty;

    public string Complexity { get; set; } = string.Empty;

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public bool IsAiAssisted { get; set; }

    public string PostingChargeType { get; set; } = string.Empty;

    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int ProposalCount { get; set; }

    public int SubmittedProposalCount { get; set; }

    public int AcceptedProposalCount { get; set; }

    public int RejectedProposalCount { get; set; }

    public int WithdrawnProposalCount { get; set; }

    public List<JobSkillResponse> Skills { get; set; } = new();
}
