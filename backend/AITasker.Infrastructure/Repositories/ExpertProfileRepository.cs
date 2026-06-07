using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class ExpertProfileRepository : IExpertProfileRepository
{
    private readonly AITaskerDbContext _context;

    public ExpertProfileRepository(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        return await _context.Users
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<ExpertProfile?> GetByUserIdAsync(int userId)
    {
        return await _context.ExpertProfiles
            .Include(x => x.User)
            .Include(x => x.Certificates)
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<bool> ExistsByUserIdAsync(int userId)
    {
        return await _context.ExpertProfiles
            .AnyAsync(x => x.UserId == userId);
    }

    public async Task AddAsync(ExpertProfile expertProfile)
    {
        await _context.ExpertProfiles.AddAsync(expertProfile);
    }

    public void RemoveCertificates(IEnumerable<ExpertCertificate> certificates)
    {
        _context.ExpertCertificates.RemoveRange(certificates);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}