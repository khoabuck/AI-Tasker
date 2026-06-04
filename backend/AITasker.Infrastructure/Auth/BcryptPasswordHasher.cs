using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Auth;

public class BcryptPasswordHasher : IPasswordHasher
{
	public string HashPassword(string password)
	{
		return BCrypt.Net.BCrypt.HashPassword(password);
	}

	public bool VerifyPassword(string password, string passwordHash)
	{
		return BCrypt.Net.BCrypt.Verify(password, passwordHash);
	}
}