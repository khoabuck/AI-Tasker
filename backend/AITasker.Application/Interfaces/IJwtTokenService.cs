using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(User user);

    DateTime GetExpiresAt();
}