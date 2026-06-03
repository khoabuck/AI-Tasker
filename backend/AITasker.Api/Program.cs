var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// TODO: Add DbContext
// TODO: Add JWT Authentication
// TODO: Add Authorization
// TODO: Add Application Services
// TODO: Add Repositories
// TODO: Add SignalR

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("FrontendCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "OK",
    service = "AITasker API"
}));

app.MapControllers();

// TODO: app.MapHub<ChatHub>("/hubs/chat");
// TODO: app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
