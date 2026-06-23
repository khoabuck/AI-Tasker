using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AITaskerDbContext _dbContext;

    public UserRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        return await _dbContext.Users
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var normalizedEmail = email.Trim().ToLower();

        return await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId)
    {
        if (string.IsNullOrWhiteSpace(googleId))
        {
            return null;
        }

        var normalizedGoogleId = googleId.Trim();

        return await _dbContext.Users
            .FirstOrDefaultAsync(x => x.GoogleId == normalizedGoogleId);
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var normalizedEmail = email.Trim().ToLower();

        return await _dbContext.Users
            .AnyAsync(x => x.Email.ToLower() == normalizedEmail);
    }

    public async Task<List<User>> GetAdminUsersAsync(
        string? search,
        string? role,
        string? status)
    {
        var query = _dbContext.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();

            query = query.Where(x =>
                x.Email.Contains(keyword) ||
                (x.FullName != null && x.FullName.Contains(keyword))
            );
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var roleValue = role.Trim().ToUpper();

            query = query.Where(x => x.Role == roleValue);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statusValue = status.Trim().ToUpper();

            query = query.Where(x => x.Status == statusValue);
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task AddAsync(User user)
    {
        await _dbContext.Users.AddAsync(user);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}