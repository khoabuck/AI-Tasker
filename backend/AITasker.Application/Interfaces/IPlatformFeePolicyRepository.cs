using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IPlatformFeePolicyRepository
{
    Task<PlatformFeePolicy?> GetActiveAsync();

    Task AddAsync(PlatformFeePolicy policy);

    Task SaveChangesAsync();
}
