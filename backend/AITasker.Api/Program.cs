using System.Text;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Infrastructure.Auth;
using AITasker.Infrastructure.BusinessVerification;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Email;
using AITasker.Infrastructure.Repositories;
using AITasker.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// =========================
// Controllers
// =========================
builder.Services.AddControllers();

// =========================
// Swagger/OpenAPI + JWT Authorize
// =========================
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Paste JWT token only. Do not type Bearer.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

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
// Dependency Injection - Repositories
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

builder.Services.AddScoped<IClientProfileRepository, ClientProfileRepository>();

builder.Services.AddScoped<
    IBusinessVerificationRepository,
    BusinessVerificationRepository
>();

builder.Services.AddScoped<IExpertProfileRepository, ExpertProfileRepository>();

// =========================
// Dependency Injection - Core Services
// =========================
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddScoped<IClientProfileService, ClientProfileService>();

builder.Services.AddScoped<
    IBusinessVerificationService,
    BusinessVerificationService
>();

builder.Services.AddScoped<IExpertProfileService, ExpertProfileService>();

// =========================
// Upload Images - Cloudinary
// =========================
builder.Services.AddScoped<IImageUploadService, CloudinaryImageUploadService>();

// =========================
// BE2 - Skills API
// =========================
builder.Services.AddScoped<ISkillService, SkillService>();

// =========================
// BE2 - Expert Skills API
// =========================
builder.Services.AddScoped<IExpertSkillService, ExpertSkillService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddHttpClient<IExpertSkillAiProvider, GroqExpertSkillAiProvider>();

// =========================
// BE2 - Jobs API
// =========================
builder.Services.AddScoped<IJobService, JobService>();

// =========================
// BE2 - AI Job Assistant
// =========================
builder.Services.AddScoped<IJobAssistantService, JobAssistantService>();
builder.Services.AddHttpClient<IJobAssistantProvider, GroqJobAssistantProvider>();

// =========================
// Business Verification Provider
// VietQR + Groq AI
// =========================
builder.Services.AddHttpClient<
    IBusinessVerificationProvider,
    GroqBusinessVerificationProvider
>();

// =========================
// Expert Profile AI Review Provider
// Groq AI
// =========================
builder.Services.AddHttpClient<
    IExpertProfileReviewProvider,
    GroqExpertProfileReviewProvider
>();

// =========================
// URL Inspection Service
// HttpClient checks whether profile proof links exist
// =========================
builder.Services.AddHttpClient<IUrlInspectionService, UrlInspectionService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(12);
});

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