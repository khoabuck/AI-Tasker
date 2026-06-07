using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AITasker.Infrastructure.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var secretKey = _configuration["Jwt:SecretKey"];

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("JWT SecretKey is missing.");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new("userId", user.UserId.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new("status", user.Status),
            new("authProvider", user.AuthProvider)
        };

        if (!string.IsNullOrWhiteSpace(user.Role))
        {
            claims.Add(new Claim(ClaimTypes.Role, user.Role));
            claims.Add(new Claim("role", user.Role));
        }

        var signingKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(secretKey)
        );

        var credentials = new SigningCredentials(
            signingKey,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: GetExpiresAt(),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public DateTime GetExpiresAt()
    {
        var expiresInMinutesText = _configuration["Jwt:ExpiresInMinutes"];

        if (!int.TryParse(expiresInMinutesText, out var expiresInMinutes))
        {
            expiresInMinutes = 120;
        }

        if (expiresInMinutes <= 0)
        {
            expiresInMinutes = 120;
        }

        return DateTime.UtcNow.AddMinutes(expiresInMinutes);
    }
}