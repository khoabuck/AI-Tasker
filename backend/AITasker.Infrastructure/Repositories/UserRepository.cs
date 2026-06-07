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
        return await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Email == email);
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId)
    {
        return await _dbContext.Users
            .FirstOrDefaultAsync(x => x.GoogleId == googleId);
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        return await _dbContext.Users
            .AnyAsync(x => x.Email == email);
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