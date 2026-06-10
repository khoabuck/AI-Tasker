using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly AITaskerDbContext _dbContext;

    public PasswordResetTokenRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(PasswordResetToken token)
    {
        await _dbContext.PasswordResetTokens.AddAsync(token);
    }

    public async Task<PasswordResetToken?> GetActiveByTokenHashAsync(string tokenHash)
    {
        return await _dbContext.PasswordResetTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x =>
                x.TokenHash == tokenHash
                && x.UsedAt == null
                && x.ExpiresAt > DateTime.UtcNow
            );
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}