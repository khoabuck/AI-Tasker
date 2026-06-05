using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailVerificationTokenRepository _emailVerificationTokenRepository;
    private readonly IPasswordResetTokenRepository _passwordResetTokenRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailSender _emailSender;

    public AuthService(
        IUserRepository userRepository,
        IEmailVerificationTokenRepository emailVerificationTokenRepository,
        IPasswordResetTokenRepository passwordResetTokenRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IEmailSender emailSender)
    {
        _userRepository = userRepository;
        _emailVerificationTokenRepository = emailVerificationTokenRepository;
        _passwordResetTokenRepository = passwordResetTokenRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _emailSender = emailSender;
    }

    public async Task<MessageResponse> RegisterAsync(RegisterRequest request)
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
            GoogleId = null,
            AvatarUrl = null,
            Status = "PENDING_EMAIL_VERIFICATION",
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        await CreateAndSendVerificationEmailAsync(user);

        return new MessageResponse
        {
            Success = true,
            Message = "Registration successful. Please check your email to verify your account."
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

        if (user.AuthProvider == "LOCAL"
            && user.Status == "PENDING_EMAIL_VERIFICATION")
        {
            throw new InvalidOperationException("Please verify your email before login.");
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            throw new InvalidOperationException("This account does not use password login.");
        }

        var passwordValid = _passwordHasher.VerifyPassword(
            password,
            user.PasswordHash
        );

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
                    throw new InvalidOperationException(
                        "Email is already linked with another Google account."
                    );
                }

                existingUserByEmail.GoogleId = googleId;
                existingUserByEmail.AvatarUrl = avatarUrl;
                existingUserByEmail.UpdatedAt = DateTime.UtcNow;

                if (existingUserByEmail.Status == "PENDING_EMAIL_VERIFICATION")
                {
                    existingUserByEmail.Status = "PENDING_ROLE";
                }

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

    public async Task<MessageResponse> VerifyEmailAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Verification token is required.");
        }

        var tokenHash = HashToken(token);

        var verificationToken = await _emailVerificationTokenRepository
            .GetActiveByTokenHashAsync(tokenHash);

        if (verificationToken == null)
        {
            throw new InvalidOperationException(
                "Verification token is invalid or expired."
            );
        }

        var user = verificationToken.User;

        if (user.Status != "PENDING_EMAIL_VERIFICATION")
        {
            throw new InvalidOperationException("Email has already been verified.");
        }

        verificationToken.UsedAt = DateTime.UtcNow;
        user.Status = "PENDING_ROLE";
        user.UpdatedAt = DateTime.UtcNow;

        await _emailVerificationTokenRepository.SaveChangesAsync();

        return new MessageResponse
        {
            Success = true,
            Message = "Email verified successfully. You can now login."
        };
    }

    public async Task<MessageResponse> ResendVerificationEmailAsync(
        ResendVerificationEmailRequest request)
    {
        var email = NormalizeEmail(request.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Email is required.");
        }

        if (!IsValidEmail(email))
        {
            throw new InvalidOperationException("Email format is invalid.");
        }

        var user = await _userRepository.GetByEmailAsync(email);

        if (user == null || user.Status != "PENDING_EMAIL_VERIFICATION")
        {
            return new MessageResponse
            {
                Success = true,
                Message = "If this email exists and is not verified, a verification email has been sent."
            };
        }

        await CreateAndSendVerificationEmailAsync(user);

        return new MessageResponse
        {
            Success = true,
            Message = "If this email exists and is not verified, a verification email has been sent."
        };
    }

    public async Task<MessageResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var email = NormalizeEmail(request.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Email is required.");
        }

        if (!IsValidEmail(email))
        {
            throw new InvalidOperationException("Email format is invalid.");
        }

        var user = await _userRepository.GetByEmailAsync(email);

        if (user != null
            && user.AuthProvider == "LOCAL"
            && !string.IsNullOrWhiteSpace(user.PasswordHash)
            && user.Status != "SUSPENDED"
            && user.Status != "BANNED")
        {
            await CreateAndSendPasswordResetEmailAsync(user);
        }

        return new MessageResponse
        {
            Success = true,
            Message = "If this email exists, a password reset link has been sent."
        };
    }

    public async Task<MessageResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var token = request.Token?.Trim() ?? string.Empty;
        var newPassword = request.NewPassword?.Trim() ?? string.Empty;
        var confirmPassword = request.ConfirmPassword?.Trim() ?? string.Empty;

        ValidateResetPassword(token, newPassword, confirmPassword);

        var tokenHash = HashToken(token);

        var resetToken = await _passwordResetTokenRepository
            .GetActiveByTokenHashAsync(tokenHash);

        if (resetToken == null)
        {
            throw new InvalidOperationException("Reset token is invalid or expired.");
        }

        var user = resetToken.User;

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            throw new InvalidOperationException(
                "Your account is not allowed to reset password."
            );
        }

        if (user.AuthProvider != "LOCAL")
        {
            throw new InvalidOperationException(
                "This account does not use password login."
            );
        }

        user.PasswordHash = _passwordHasher.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;

        resetToken.UsedAt = DateTime.UtcNow;

        await _passwordResetTokenRepository.SaveChangesAsync();

        return new MessageResponse
        {
            Success = true,
            Message = "Password reset successfully. You can now login with your new password."
        };
    }

    public async Task<UserResponse?> GetCurrentUserAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);

        return user == null ? null : MapToUserResponse(user);
    }

    private async Task CreateAndSendVerificationEmailAsync(User user)
    {
        var rawToken = GenerateSecureToken();
        var tokenHash = HashToken(rawToken);

        var verificationToken = new EmailVerificationToken
        {
            UserId = user.UserId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow
        };

        await _emailVerificationTokenRepository.AddAsync(verificationToken);
        await _emailVerificationTokenRepository.SaveChangesAsync();

        var backendBaseUrl = "http://localhost:5070";

        var verifyUrl =
            $"{backendBaseUrl}/api/auth/verify-email?token={Uri.EscapeDataString(rawToken)}";

        var htmlBody = $@"
            <h2>Welcome to AITasker</h2>
            <p>Hello {user.FullName},</p>
            <p>Please verify your email by clicking the link below:</p>
            <p><a href=""{verifyUrl}"">Verify your email</a></p>
            <p>This link will expire in 24 hours.</p>
        ";

        await _emailSender.SendEmailAsync(
            user.Email,
            "Verify your AITasker account",
            htmlBody
        );
    }

    private async Task CreateAndSendPasswordResetEmailAsync(User user)
    {
        var rawToken = GenerateSecureToken();
        var tokenHash = HashToken(rawToken);

        var resetToken = new PasswordResetToken
        {
            UserId = user.UserId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            CreatedAt = DateTime.UtcNow
        };

        await _passwordResetTokenRepository.AddAsync(resetToken);
        await _passwordResetTokenRepository.SaveChangesAsync();

        var frontendBaseUrl = "http://localhost:5173";

        var resetUrl =
            $"{frontendBaseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";

        var htmlBody = $@"
            <h2>Reset your AITasker password</h2>
            <p>Hello {user.FullName},</p>
            <p>We received a request to reset your password.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href=""{resetUrl}"">Reset your password</a></p>
            <p>This link will expire in 30 minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
        ";

        await _emailSender.SendEmailAsync(
            user.Email,
            "Reset your AITasker password",
            htmlBody
        );
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);

        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));

        return Convert.ToHexString(bytes);
    }

    private static string NormalizeEmail(string? email)
    {
        return email?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    private static void ValidateRegister(
        string email,
        string password,
        string fullName)
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

    private static void ValidateResetPassword(
        string token,
        string newPassword,
        string confirmPassword)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Reset token is required.");
        }

        if (string.IsNullOrWhiteSpace(newPassword))
        {
            throw new InvalidOperationException("New password is required.");
        }

        if (newPassword.Length < 6)
        {
            throw new InvalidOperationException(
                "New password must be at least 6 characters."
            );
        }

        if (newPassword.Length > 100)
        {
            throw new InvalidOperationException(
                "New password must not exceed 100 characters."
            );
        }

        if (string.IsNullOrWhiteSpace(confirmPassword))
        {
            throw new InvalidOperationException("Confirm password is required.");
        }

        if (newPassword != confirmPassword)
        {
            throw new InvalidOperationException("Confirm password does not match.");
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var mailAddress = new MailAddress(email);

            return mailAddress.Address.Equals(
                email,
                StringComparison.OrdinalIgnoreCase
            );
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