using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IBusinessVerificationRepository
{
    Task<List<BusinessProfile>> GetPendingAsync();

    Task<BusinessProfile?> GetByIdAsync(int businessProfileId);

    Task SaveChangesAsync();
}