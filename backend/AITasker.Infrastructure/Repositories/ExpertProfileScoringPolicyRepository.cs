using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class ExpertProfileScoringPolicyRepository : IExpertProfileScoringPolicyRepository
{
    private readonly AITaskerDbContext _dbContext;

    public ExpertProfileScoringPolicyRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ExpertProfileScoringPolicy?> GetActiveAsync()
    {
        return await _dbContext.ExpertProfileScoringPolicies
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.IsActive);
    }

    public async Task AddAsync(ExpertProfileScoringPolicy policy)
    {
        await _dbContext.ExpertProfileScoringPolicies.AddAsync(policy);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}
