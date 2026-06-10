using System.Text;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Infrastructure.Auth;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Email;
using AITasker.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// =========================
// Controllers
// =========================
builder.Services.AddControllers();


// =========================
// SignalR
// =========================
builder.Services.AddSignalR();

// =========================
// Swagger/OpenAPI basic
// =========================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// =========================
// CORS
// =========================
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// =========================
// Database
// =========================
builder.Services.AddDbContext<AITaskerDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    );
});

// =========================
// JWT config
// =========================
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];

if (string.IsNullOrWhiteSpace(jwtSecretKey))
{
    throw new InvalidOperationException(
        "JWT SecretKey is missing in appsettings.json or appsettings.Development.json."
    );
}

// =========================
// Google OAuth config
// =========================
var googleClientId = builder.Configuration["GoogleAuth:ClientId"];
var googleClientSecret = builder.Configuration["GoogleAuth:ClientSecret"];

if (string.IsNullOrWhiteSpace(googleClientId)
    || string.IsNullOrWhiteSpace(googleClientSecret))
{
    Console.WriteLine("WARNING: GoogleAuth ClientId or ClientSecret is missing.");
}

// =========================
// Authentication
// =========================
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSecretKey)
            ),

            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    })
    .AddCookie("External", options =>
    {
        options.Cookie.Name = "AITasker.External";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
        options.SlidingExpiration = false;
    })
    .AddGoogle("Google", options =>
    {
        options.ClientId = googleClientId ?? string.Empty;
        options.ClientSecret = googleClientSecret ?? string.Empty;
        options.SignInScheme = "External";
        options.CallbackPath = "/signin-google";

        options.Scope.Add("profile");
        options.Scope.Add("email");
        options.SaveTokens = true;

        options.ClaimActions.MapJsonKey(
            "urn:google:picture",
            "picture",
            "url"
        );
    });

builder.Services.AddAuthorization();

// =========================
// Dependency Injection
// =========================
builder.Services.AddScoped<IUserRepository, UserRepository>();

builder.Services.AddScoped<
    IEmailVerificationTokenRepository,
    EmailVerificationTokenRepository
>();

builder.Services.AddScoped<
    IPasswordResetTokenRepository,
    PasswordResetTokenRepository
>();

builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddScoped<AITasker.Application.Interfaces.IWalletService, AITasker.Infrastructure.Banking.WalletService>();

builder.Services.AddScoped<AITasker.Application.Interfaces.IDisputeService, AITasker.Infrastructure.Disputes.DisputeService>();

builder.Services.AddSingleton<AITasker.Infrastructure.Banking.VNPayService>();
builder.Services.AddScoped<AITasker.Infrastructure.AI.GroqService>();

builder.Services.AddHttpClient();

// =========================
// App pipeline
// =========================
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Local dev tạm thời không bật HTTPS redirect.
// app.UseHttpsRedirection();

app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// =======================================================
// MAP SIGNALR REALTIME HUBS ENDPOINTS
// =======================================================
app.MapHub<AITasker.Api.Hubs.ChatHub>("/hubs/chat");
app.MapHub<AITasker.Api.Hubs.NotificationHub>("/hubs/notifications");

// =========================
// Test endpoints
// =========================
app.MapGet("/", () => Results.Ok(new
{
    message = "AITasker API is running",
    swagger = "/swagger",
    health = "/api/health",
    databaseHealth = "/api/health/db",
    googleLogin = "/api/auth/google-login"
}));

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    app = "AITasker.Api",
    environment = app.Environment.EnvironmentName,
    time = DateTime.UtcNow
}));

app.MapGet("/api/health/db", async (AITaskerDbContext dbContext) =>
{
    try
    {
        await dbContext.Database.OpenConnectionAsync();
        await dbContext.Database.CloseConnectionAsync();

        return Results.Ok(new
        {
            database = "connected",
            provider = dbContext.Database.ProviderName,
            time = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Database connection failed",
            detail: ex.InnerException?.Message ?? ex.Message
        );
    }
});

app.Run();