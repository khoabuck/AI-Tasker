using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IPasswordResetTokenRepository
{
    Task AddAsync(PasswordResetToken token);

    Task<PasswordResetToken?> GetActiveByTokenHashAsync(string tokenHash);

    Task SaveChangesAsync();
}