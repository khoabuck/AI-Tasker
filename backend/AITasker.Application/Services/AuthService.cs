using System.Net.Mail;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password?.Trim() ?? string.Empty;
        var fullName = request.FullName?.Trim() ?? string.Empty;

        ValidateRegister(email, password, fullName);

        var emailExists = await _userRepository.EmailExistsAsync(email);

        if (emailExists)
        {
            throw new InvalidOperationException("Email already exists.");
        }

        var user = new User
        {
            Email = email,
            PasswordHash = _passwordHasher.HashPassword(password),
            FullName = fullName,
            Role = null,
            AuthProvider = "LOCAL",
            Status = "PENDING_ROLE",
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = _jwtTokenService.GenerateToken(user),
            ExpiresAt = _jwtTokenService.GetExpiresAt(),
            User = MapToUserResponse(user)
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password?.Trim() ?? string.Empty;

        ValidateLogin(email, password);

        var user = await _userRepository.GetByEmailAsync(email);

        if (user == null)
        {
            throw new InvalidOperationException("Invalid email or password.");
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            throw new InvalidOperationException("This account does not use password login.");
        }

        var passwordValid = _passwordHasher.VerifyPassword(password, user.PasswordHash);

        if (!passwordValid)
        {
            throw new InvalidOperationException("Invalid email or password.");
        }

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            throw new InvalidOperationException("Your account is not allowed to login.");
        }

        return new AuthResponse
        {
            AccessToken = _jwtTokenService.GenerateToken(user),
            ExpiresAt = _jwtTokenService.GetExpiresAt(),
            User = MapToUserResponse(user)
        };
    }

    public async Task<AuthResponse> GoogleLoginAsync(
        string email,
        string fullName,
        string googleId,
        string? avatarUrl)
    {
        email = NormalizeEmail(email);
        fullName = fullName.Trim();
        googleId = googleId.Trim();

        if (string.IsNullOrWhiteSpace(googleId))
        {
            throw new InvalidOperationException("Google account id is missing.");
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Google email is missing.");
        }

        if (!IsValidEmail(email))
        {
            throw new InvalidOperationException("Google email format is invalid.");
        }

        if (string.IsNullOrWhiteSpace(fullName))
        {
            fullName = email;
        }

        var user = await _userRepository.GetByGoogleIdAsync(googleId);

        if (user == null)
        {
            var existingUserByEmail = await _userRepository.GetByEmailAsync(email);

            if (existingUserByEmail != null)
            {
                if (!string.IsNullOrWhiteSpace(existingUserByEmail.GoogleId)
                    && existingUserByEmail.GoogleId != googleId)
                {
                    throw new InvalidOperationException("Email is already linked with another Google account.");
                }

                existingUserByEmail.GoogleId = googleId;
                existingUserByEmail.AvatarUrl = avatarUrl;
                existingUserByEmail.UpdatedAt = DateTime.UtcNow;

                user = existingUserByEmail;
            }
            else
            {
                user = new User
                {
                    Email = email,
                    PasswordHash = null,
                    FullName = fullName,
                    Role = null,
                    AuthProvider = "GOOGLE",
                    GoogleId = googleId,
                    AvatarUrl = avatarUrl,
                    Status = "PENDING_ROLE",
                    CreatedAt = DateTime.UtcNow
                };

                await _userRepository.AddAsync(user);
            }

            await _userRepository.SaveChangesAsync();
        }

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            throw new InvalidOperationException("Your account is not allowed to login.");
        }

        return new AuthResponse
        {
            AccessToken = _jwtTokenService.GenerateToken(user),
            ExpiresAt = _jwtTokenService.GetExpiresAt(),
            User = MapToUserResponse(user)
        };
    }

    public async Task<UserResponse?> GetCurrentUserAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);

        return user == null ? null : MapToUserResponse(user);
    }

    private static string NormalizeEmail(string? email)
    {
        return email?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    private static void ValidateRegister(string email, string password, string fullName)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Email is required.");
        }

        if (!IsValidEmail(email))
        {
            throw new InvalidOperationException("Email format is invalid.");
        }

        if (email.Length > 255)
        {
            throw new InvalidOperationException("Email must not exceed 255 characters.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Password is required.");
        }

        if (password.Length < 6)
        {
            throw new InvalidOperationException("Password must be at least 6 characters.");
        }

        if (password.Length > 100)
        {
            throw new InvalidOperationException("Password must not exceed 100 characters.");
        }

        if (string.IsNullOrWhiteSpace(fullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        if (fullName.Length < 2)
        {
            throw new InvalidOperationException("Full name must be at least 2 characters.");
        }

        if (fullName.Length > 255)
        {
            throw new InvalidOperationException("Full name must not exceed 255 characters.");
        }
    }

    private static void ValidateLogin(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Email is required.");
        }

        if (!IsValidEmail(email))
        {
            throw new InvalidOperationException("Email format is invalid.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Password is required.");
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var mailAddress = new MailAddress(email);

            return mailAddress.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static UserResponse MapToUserResponse(User user)
    {
        return new UserResponse
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            AuthProvider = user.AuthProvider,
            AvatarUrl = user.AvatarUrl
        };
    }
}