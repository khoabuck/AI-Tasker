using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IJobSkillRelevanceValidator
{
    Task<JobSkillRelevanceValidationResult> ValidateAsync(
        JobSkillRelevanceValidationRequest request
    );
}
