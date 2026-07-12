using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Banking;

public class WithdrawalExpiryHostedService : BackgroundService
{
    private const string WithdrawalStatusPending = "PENDING";
    private const string WithdrawalStatusExpired = "EXPIRED";
    private const string TransactionStatusSuccess = "SUCCESS";
    private const string TransactionTypeWithdrawalExpired = "WITHDRAWAL_EXPIRED";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WithdrawalExpiryHostedService> _logger;

    public WithdrawalExpiryHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<WithdrawalExpiryHostedService> logger)
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
                await ExpirePendingWithdrawalsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Withdrawal expiry job failed.");
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

    private async Task ExpirePendingWithdrawalsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AITaskerDbContext>();
        var workflowPolicyService = scope.ServiceProvider.GetRequiredService<IMarketplaceWorkflowPolicyService>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var policy = await workflowPolicyService.GetActivePolicyAsync();
        var now = DateTime.UtcNow;
        var cutoff = now.AddHours(-policy.WithdrawalApprovalWindowHours);

        var withdrawals = await context.WithdrawalRequests
            .Where(x => x.Status == WithdrawalStatusPending && x.CreatedAt <= cutoff)
            .OrderBy(x => x.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var withdrawal in withdrawals)
        {
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
            var completed = false;

            try
            {
                var current = await context.WithdrawalRequests
                    .FirstAsync(x => x.WithdrawalRequestId == withdrawal.WithdrawalRequestId, cancellationToken);

                if (current.Status != WithdrawalStatusPending)
                {
                    await transaction.CommitAsync(cancellationToken);
                    completed = true;
                    continue;
                }

                var wallet = await context.Wallets
                    .FirstOrDefaultAsync(x => x.UserId == current.UserId, cancellationToken);

                if (wallet == null)
                {
                    throw new InvalidOperationException($"Wallet not found for withdrawal request {current.WithdrawalRequestId}.");
                }

                if (wallet.LockedBalance < current.Amount)
                {
                    throw new InvalidOperationException($"Locked balance is not enough for withdrawal request {current.WithdrawalRequestId}.");
                }

                wallet.LockedBalance -= current.Amount;
                wallet.AvailableBalance += current.Amount;
                wallet.UpdatedAt = now;

                current.Status = WithdrawalStatusExpired;
                current.FailureReason = "Withdrawal approval window expired before admin processing.";
                current.ProcessedAt = now;

                context.Transactions.Add(new Transaction
                {
                    UserId = current.UserId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = current.Amount,
                    Type = TransactionTypeWithdrawalExpired,
                    Status = TransactionStatusSuccess,
                    Description = $"[Withdrawal Expired] Returned held withdrawal amount for Withdrawal Request ID {current.WithdrawalRequestId} because admin did not process it before the approval deadline.",
                    ReferenceId = $"WITHDRAWAL_{current.WithdrawalRequestId}",
                    CreatedAt = now
                });

                await context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                completed = true;

                await notificationService.CreateNotificationAsync(
                    current.UserId,
                    "Withdrawal expired",
                    $"Your withdrawal request of {current.Amount:N0} VND expired before admin processing. The held amount has been returned to your available balance.",
                    "WITHDRAWAL_EXPIRED",
                    relatedEntityType: "WITHDRAWAL",
                    relatedEntityId: current.WithdrawalRequestId);
            }
            catch
            {
                if (!completed)
                {
                    await transaction.RollbackAsync(cancellationToken);
                }

                throw;
            }
        }
    }
}
