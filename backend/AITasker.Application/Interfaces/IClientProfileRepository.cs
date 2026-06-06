using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IClientProfileRepository
{
    Task<ClientProfile?> GetByUserIdAsync(int userId);

    Task<bool> TaxCodeExistsAsync(string taxCode);

    Task<bool> TaxCodeExistsExceptBusinessProfileAsync(
        string taxCode,
        int businessProfileId
    );

    Task AddAsync(ClientProfile clientProfile);

    Task SaveChangesAsync();
}