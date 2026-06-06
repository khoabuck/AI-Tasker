using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class BusinessVerificationRepository : IBusinessVerificationRepository
{
    private readonly AITaskerDbContext _dbContext;

    public BusinessVerificationRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<BusinessProfile>> GetPendingAsync()
    {
        return await _dbContext.BusinessProfiles
            .Include(x => x.ClientProfile)
            .ThenInclude(x => x.User)
            .Where(x =>
                x.VerificationStatus == "PENDING"
                || x.VerificationStatus == "PENDING_REVIEW"
            )
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<BusinessProfile?> GetByIdAsync(int businessProfileId)
    {
        return await _dbContext.BusinessProfiles
            .Include(x => x.ClientProfile)
            .ThenInclude(x => x.User)
            .FirstOrDefaultAsync(x => x.BusinessProfileId == businessProfileId);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}