using System.Text;
using AITasker.Api.Hubs;
using AITasker.Application.Interfaces;
using AITasker.Application.Services;
using AITasker.Infrastructure.Auth;
using AITasker.Infrastructure.AI;
using AITasker.Infrastructure.BusinessVerification;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Email;
using AITasker.Infrastructure.Repositories;
using AITasker.Infrastructure.Services;
using AITasker.Infrastructure.Reviews;
using AITasker.Infrastructure.Banking;
using AITasker.Infrastructure.Dashboards;
using AITasker.Infrastructure.Conversations;
using AITasker.Infrastructure.Contracts;
using AITasker.Infrastructure.Projects;
using AITasker.Api.BackgroundServices;
using AITasker.Infrastructure.Notifications;
using AITasker.Infrastructure.Payments.PayOs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Microsoft.AspNetCore.HttpOverrides;
var builder = WebApplication.CreateBuilder(args);
//BE 1 => Phan Tien Phat

// =========================
// Controllers
// =========================
builder.Services.AddControllers();

// =========================
// SignalR
// =========================
builder.Services.AddSignalR();

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
// Forwarded Headers
// Fix HTTPS behind Render / Cloudflare / reverse proxy
// =========================
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // Required for cloud proxies like Render/Cloudflare.
    // Without this, ASP.NET Core may ignore forwarded headers
    // and generate http:// redirect_uri instead of https://.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// =========================
// CORS
// =========================
const string CorsPolicyName = "FrontendPolicy";

var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

var allowedOrigins = configuredOrigins
    .Concat(new[]
    {
        "http://localhost:5173",
        "http://localhost:5174"
    })
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

Console.WriteLine("Allowed CORS origins: " + string.Join(", ", allowedOrigins));

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin))
                {
                    return false;
                }

                var normalizedOrigin = origin.Trim().TrimEnd('/');

                return allowedOrigins.Contains(
                    normalizedOrigin,
                    StringComparer.OrdinalIgnoreCase
                );
            })
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
    });

builder.Services.AddAuthorization();

// =========================
// Dependency Injection - Repositories
// =========================
builder.Services.AddScoped<IUserRepository, UserRepository>();

builder.Services.AddScoped<IAdminAuditLogRepository, AdminAuditLogRepository>();

builder.Services.AddScoped<IPlatformFeePolicyRepository, PlatformFeePolicyRepository>();

builder.Services.AddScoped<IExpertProfileScoringPolicyRepository, ExpertProfileScoringPolicyRepository>();

builder.Services.AddScoped<
    IEmailVerificationTokenRepository,
    EmailVerificationTokenRepository
>();

builder.Services.AddScoped<
    IPasswordResetTokenRepository,
    PasswordResetTokenRepository
>();

builder.Services.AddScoped<IClientProfileRepository, ClientProfileRepository>();

builder.Services.AddScoped<IExpertProfileRepository, ExpertProfileRepository>();

// =========================
// Dependency Injection - Auth / Security Services
// =========================
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailSender, GmailSmtpEmailSender>();
builder.Services.AddScoped<IAuthService, AuthService>();

// =========================
// Dependency Injection - Client / Business / Expert Profile
// =========================
builder.Services.AddScoped<IClientProfileService, ClientProfileService>();

builder.Services.AddScoped<IExpertProfileService, ExpertProfileService>();

// =========================
// Admin User Management + Audit Log
// =========================
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddScoped<IAdminAuditLogService, AdminAuditLogService>();

builder.Services.AddScoped<IPlatformFeePolicyService, PlatformFeePolicyService>();

builder.Services.AddScoped<IExpertProfileScoringPolicyService, ExpertProfileScoringPolicyService>();

builder.Services.AddScoped<IJobPostingAiPolicyService, JobPostingAiPolicyService>();
// =========================
// Admin AI Management / Groq Runtime Config
// =========================
builder.Services.AddScoped<IAiManagementService, AiManagementService>();
builder.Services.AddHttpClient<IGroqChatCompletionService, GroqChatCompletionService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(45);
});

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
builder.Services.AddScoped<IExpertSkillAiProvider, GroqExpertSkillAiProvider>();

// =========================
// BE2 - Expert Directory / Recommendation
// =========================
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IExpertDirectoryService, ExpertDirectoryService>();

// =========================
// BE2 - Jobs API
// =========================
builder.Services.AddScoped<IJobService, JobService>();

builder.Services.AddScoped<IJobCreditPackageService, JobCreditPackageService>();

// =========================
// BE2 - AI Job Assistant
// =========================
builder.Services.AddScoped<IJobAssistantService, JobAssistantService>();
builder.Services.AddScoped<IJobAssistantProvider, GroqJobAssistantProvider>();
builder.Services.AddScoped<IJobSkillRelevanceValidator, GroqJobSkillRelevanceValidator>();

// =========================
// BE2 - Proposal / Contract / Project / Milestone Flow
// =========================
builder.Services.AddScoped<IMarketplaceWorkflowPolicyService, MarketplaceWorkflowPolicyService>();
builder.Services.AddScoped<IAdminProposalCreditService, AdminProposalCreditService>();
builder.Services.AddScoped<IProposalService, AITasker.Infrastructure.Proposals.ProposalService>();
builder.Services.AddScoped<IProposalCreditPackageService, ProposalCreditPackageService>();
builder.Services.AddScoped<IExpertEarningEscrowService, ExpertEarningEscrowService>();
builder.Services.AddScoped<IProjectCompletionService, ProjectCompletionService>();
builder.Services.AddScoped<IContractFailureRollbackService, ContractFailureRollbackService>();
builder.Services.AddScoped<IProjectContractService, AITasker.Infrastructure.Contracts.ProjectContractService>();
builder.Services.AddScoped<IProjectService, AITasker.Infrastructure.Projects.ProjectService>();
builder.Services.AddHostedService<MilestoneDeadlineHostedService>();
builder.Services.AddHostedService<PendingEscrowDeadlineHostedService>();
builder.Services.AddHostedService<ContractSignDeadlineHostedService>();
builder.Services.AddScoped<IConversationService, ConversationService>();

// =========================
// BE2 - Review Flow
// =========================
builder.Services.AddScoped<IReviewService, ReviewService>();

// =========================
// BE2 - Admin Dashboard
// =========================
builder.Services.AddScoped<IAdminDashboardService, AdminDashboardService>();

// =========================
// BE3 - Wallet / Escrow / PayOS / Withdrawal
// =========================
builder.Services.AddHttpClient<IWalletService, WalletService>();
builder.Services.AddHttpClient<IPayOsPayoutService, PayOsPayoutService>();
builder.Services.AddScoped<IWithdrawalService, WithdrawalService>();
builder.Services.AddScoped<IPlatformWalletService, PlatformWalletService>();

// =========================
// BE3 - Deliverables / Disputes
// =========================
builder.Services.AddScoped<IDeliverableService, AITasker.Infrastructure.Deliverables.DeliverableService>();
builder.Services.AddHostedService<AITasker.Infrastructure.Deliverables.DeliverableReviewDeadlineHostedService>();
builder.Services.AddScoped<IDisputeService, AITasker.Infrastructure.Disputes.DisputeService>();

// =========================
// BE3 - Notifications / Realtime
// =========================
builder.Services.AddScoped<INotificationService, AITasker.Infrastructure.Notifications.NotificationService>();
builder.Services.AddScoped<INotificationRealtimeService, AITasker.Api.Realtime.NotificationRealtimeService>();

builder.Services.AddScoped<IJobDigestNotificationService, JobDigestNotificationService>();
builder.Services.AddHostedService<JobDigestNotificationHostedService>();

// =========================
// HttpClient
// =========================
builder.Services.AddHttpClient();

// =========================
// Business Verification Provider
// VietQR only
// =========================
builder.Services.AddHttpClient<
    IBusinessVerificationProvider,
    VietQrBusinessVerificationProvider
>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(12);
});

// =========================
// Expert Profile AI Review Provider
// Groq AI
// =========================
builder.Services.AddScoped<
    IExpertProfileReviewProvider,
    GroqExpertProfileReviewProvider
>();

// =========================
// Certificate Verification Service
// HttpClient checks and scores certificate proof links
// =========================
builder.Services.AddHttpClient<
    ICertificateVerificationService,
    CertificateVerificationService
>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(12);
});

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

// IMPORTANT:
// This must run before HTTPS redirection, routing, CORS, authentication.
// It fixes Google OAuth redirect_uri from http://... to https://...
// when the app is deployed behind Render / Cloudflare.
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseRouting();

app.UseCors(CorsPolicyName);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireCors(CorsPolicyName);

// =======================================================
// MAP SIGNALR REALTIME HUBS ENDPOINTS
// =======================================================
app.MapHub<AITasker.Api.Hubs.NotificationHub>("/hubs/notifications")
    .RequireCors(CorsPolicyName);

app.MapHub<ConversationHub>("/hubs/conversations")
    .RequireCors(CorsPolicyName);

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
})).RequireCors(CorsPolicyName);

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    app = "AITasker.Api",
    environment = app.Environment.EnvironmentName,
    time = DateTime.UtcNow
})).RequireCors(CorsPolicyName);

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
}).RequireCors(CorsPolicyName);

app.Run();
