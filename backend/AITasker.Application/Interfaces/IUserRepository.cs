using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int userId);

    Task<User?> GetByEmailAsync(string email);

    Task<User?> GetByGoogleIdAsync(string googleId);

    Task<bool> EmailExistsAsync(string email);

    Task AddAsync(User user);

    Task SaveChangesAsync();

    Task<List<User>> GetAdminUsersAsync(
        string? search,
        string? role,
        string? status
    );
}