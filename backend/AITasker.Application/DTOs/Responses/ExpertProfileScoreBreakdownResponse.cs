namespace AITasker.Application.DTOs.Responses;

public class ExpertProfileScoreBreakdownResponse
{
    public ExpertProfileScoreItemResponse ProfileCompleteness { get; set; } = new();

    public ExpertProfileScoreItemResponse AiSkillRelevance { get; set; } = new();

    public ExpertProfileScoreItemResponse ExperienceCredibility { get; set; } = new();

    public ExpertProfileScoreItemResponse ProofEvidence { get; set; } = new();

    public ExpertProfileScoreItemResponse CertificateEvidence { get; set; } = new();

    public ExpertProfileScoreItemResponse TrustRisk { get; set; } = new();
}