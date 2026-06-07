using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IExpertProfileRepository
{
    Task<User?> GetUserByIdAsync(int userId);

    Task<ExpertProfile?> GetByUserIdAsync(int userId);

    Task<bool> ExistsByUserIdAsync(int userId);

    Task AddAsync(ExpertProfile expertProfile);

    void RemoveCertificates(IEnumerable<ExpertCertificate> certificates);

    Task SaveChangesAsync();
}