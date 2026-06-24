using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class ClientProfileRepository : IClientProfileRepository
{
    private readonly AITaskerDbContext _dbContext;

    public ClientProfileRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ClientProfile?> GetByUserIdAsync(int userId)
    {
        return await _dbContext.ClientProfiles
            .Include(x => x.User)
            .Include(x => x.BusinessProfile)
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<bool> PhoneNumberExistsAsync(string phoneNumber)
    {
        return await _dbContext.ClientProfiles
            .AnyAsync(x => x.PhoneNumber == phoneNumber);
    }

    public async Task<bool> PhoneNumberExistsExceptClientProfileAsync(
        string phoneNumber,
        int clientProfileId)
    {
        return await _dbContext.ClientProfiles
            .AnyAsync(x =>
                x.PhoneNumber == phoneNumber
                && x.ClientProfileId != clientProfileId
            );
    }

    public async Task<bool> TaxCodeExistsAsync(string taxCode)
    {
        return await _dbContext.BusinessProfiles
            .AnyAsync(x => x.TaxCode == taxCode);
    }

    public async Task<bool> TaxCodeExistsExceptBusinessProfileAsync(
        string taxCode,
        int businessProfileId)
    {
        return await _dbContext.BusinessProfiles
            .AnyAsync(x =>
                x.TaxCode == taxCode
                && x.BusinessProfileId != businessProfileId
            );
    }

    public async Task AddAsync(ClientProfile clientProfile)
    {
        await _dbContext.ClientProfiles.AddAsync(clientProfile);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}