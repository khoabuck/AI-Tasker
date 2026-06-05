using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IEmailVerificationTokenRepository
{
    Task AddAsync(EmailVerificationToken token);

    Task<EmailVerificationToken?> GetActiveByTokenHashAsync(string tokenHash);

    Task SaveChangesAsync();
}
