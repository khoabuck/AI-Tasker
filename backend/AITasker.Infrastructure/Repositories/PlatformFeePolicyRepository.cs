using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class PlatformFeePolicyRepository : IPlatformFeePolicyRepository
{
    private readonly AITaskerDbContext _dbContext;

    public PlatformFeePolicyRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PlatformFeePolicy?> GetActiveAsync()
    {
        return await _dbContext.PlatformFeePolicies
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.IsActive);
    }

    public async Task AddAsync(PlatformFeePolicy policy)
    {
        await _dbContext.PlatformFeePolicies.AddAsync(policy);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}
