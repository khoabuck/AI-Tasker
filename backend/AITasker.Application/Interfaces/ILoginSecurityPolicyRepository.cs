using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface ILoginSecurityPolicyRepository
{
    Task<LoginSecurityPolicy?> GetActiveAsync();

    Task AddAsync(LoginSecurityPolicy policy);

    Task SaveChangesAsync();
}
