using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IExpertProfileScoringPolicyRepository
{
    Task<ExpertProfileScoringPolicy?> GetActiveAsync();

    Task AddAsync(ExpertProfileScoringPolicy policy);

    Task SaveChangesAsync();
}
