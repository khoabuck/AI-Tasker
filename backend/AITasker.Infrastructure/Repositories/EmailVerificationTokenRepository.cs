using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class EmailVerificationTokenRepository : IEmailVerificationTokenRepository
{
    private readonly AITaskerDbContext _dbContext;

    public EmailVerificationTokenRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(EmailVerificationToken token)
    {
        await _dbContext.EmailVerificationTokens.AddAsync(token);
    }

    public async Task<EmailVerificationToken?> GetActiveByTokenHashAsync(string tokenHash)
    {
        return await _dbContext.EmailVerificationTokens
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