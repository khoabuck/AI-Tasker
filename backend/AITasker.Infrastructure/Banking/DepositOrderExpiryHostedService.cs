using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Banking;

public class DepositOrderExpiryHostedService : BackgroundService
{
    private const string DepositOrderPending = "PENDING";
    private const string DepositOrderExpired = "EXPIRED";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DepositOrderExpiryHostedService> _logger;

    public DepositOrderExpiryHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<DepositOrderExpiryHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpirePendingDepositOrdersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Deposit order expiry job failed.");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task ExpirePendingDepositOrdersAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AITaskerDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;

        var orders = await context.DepositOrders
            .Where(x => x.Status == DepositOrderPending && x.ExpiresAt <= now)
            .OrderBy(x => x.ExpiresAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var order in orders)
        {
            order.Status = DepositOrderExpired;
        }

        if (orders.Count == 0)
        {
            return;
        }

        await context.SaveChangesAsync(cancellationToken);

        foreach (var order in orders)
        {
            await notificationService.CreateNotificationAsync(
                order.UserId,
                "Deposit order expired",
                $"Your deposit order {order.OrderCode} expired before payment confirmation was received.",
                "DEPOSIT_EXPIRED",
                relatedEntityType: "DEPOSIT_ORDER",
                relatedEntityId: order.DepositOrderId);
        }
    }
}
