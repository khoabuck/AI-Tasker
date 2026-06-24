using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IClientProfileRepository
{
    Task<ClientProfile?> GetByUserIdAsync(int userId);

    Task<bool> PhoneNumberExistsAsync(string phoneNumber);

    Task<bool> PhoneNumberExistsExceptClientProfileAsync(
        string phoneNumber,
        int clientProfileId
    );


    Task<bool> BusinessEmailExistsAsync(string businessEmail);

    Task<bool> BusinessEmailExistsExceptBusinessProfileAsync(
        string businessEmail,
        int businessProfileId
    );

    Task<bool> TaxCodeExistsAsync(string taxCode);

    Task<bool> TaxCodeExistsExceptBusinessProfileAsync(
        string taxCode,
        int businessProfileId
    );

    Task AddAsync(ClientProfile clientProfile);

    Task SaveChangesAsync();
}