using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class LoginSecurityPolicyRepository : ILoginSecurityPolicyRepository
{
    private readonly AITaskerDbContext _dbContext;

    public LoginSecurityPolicyRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LoginSecurityPolicy?> GetActiveAsync()
    {
        return await _dbContext.LoginSecurityPolicies
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.IsActive);
    }

    public async Task AddAsync(LoginSecurityPolicy policy)
    {
        await _dbContext.LoginSecurityPolicies.AddAsync(policy);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}
