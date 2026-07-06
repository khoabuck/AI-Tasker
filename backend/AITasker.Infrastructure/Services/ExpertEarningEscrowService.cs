using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class ExpertEarningEscrowService : IExpertEarningEscrowService
{
    private const string TransactionStatusSuccess = "SUCCESS";
    private const string TxExpertPendingEarningHold = "EXPERT_PENDING_EARNING_HOLD";
    private const string TxExpertPendingEarningRelease = "EXPERT_PENDING_EARNING_RELEASE";
    private const string TxExpertPendingEarningRefund = "EXPERT_PENDING_EARNING_REFUND";

    private readonly AITaskerDbContext _context;

    public ExpertEarningEscrowService(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<decimal> GetPendingEarningsForProjectAsync(
        int projectId,
        int expertUserId)
    {
        var totalHeldForProject = await _context.Transactions
            .Where(x =>
                x.UserId == expertUserId &&
                x.ProjectId == projectId &&
                x.Status == TransactionStatusSuccess &&
                x.Type == TxExpertPendingEarningHold)
            .SumAsync(x => (decimal?)x.Amount) ?? 0m;

        var totalReleasedForProject = await _context.Transactions
            .Where(x =>
                x.UserId == expertUserId &&
                x.ProjectId == projectId &&
                x.Status == TransactionStatusSuccess &&
                x.Type == TxExpertPendingEarningRelease)
            .SumAsync(x => (decimal?)x.Amount) ?? 0m;

        var totalRefundedForProject = await _context.Transactions
            .Where(x =>
                x.UserId == expertUserId &&
                x.ProjectId == projectId &&
                x.Status == TransactionStatusSuccess &&
                x.Type == TxExpertPendingEarningRefund)
            .SumAsync(x => (decimal?)x.Amount) ?? 0m;

        return Math.Max(
            totalHeldForProject - totalReleasedForProject - totalRefundedForProject,
            0m);
    }

    public async Task<decimal> ReleaseProjectPendingEarningsAsync(
        Project project,
        ExpertProfile expertProfile)
    {
        var releaseAmount = await GetPendingEarningsForProjectAsync(
            project.ProjectId,
            expertProfile.UserId);

        if (releaseAmount <= 0)
        {
            return 0m;
        }

        var expertWallet = await GetOrCreateWalletAsync(expertProfile.UserId);

        if (expertWallet.PendingEarningsBalance < releaseAmount)
        {
            throw new InvalidOperationException("Expert pending earnings balance is insufficient for project completion release.");
        }

        expertWallet.PendingEarningsBalance -= releaseAmount;
        expertWallet.AvailableBalance += releaseAmount;
        expertWallet.UpdatedAt = VietnamDateTime.Now;

        _context.Transactions.Add(new Transaction
        {
            UserId = expertProfile.UserId,
            ProjectId = project.ProjectId,
            Amount = releaseAmount,
            Type = TxExpertPendingEarningRelease,
            Status = TransactionStatusSuccess,
            Description = $"[Expert Pending Earning Release] Released held earnings for completed Project ID {project.ProjectId}",
            ReferenceId = $"PROJECT_{project.ProjectId}",
            CreatedAt = VietnamDateTime.Now
        });

        return releaseAmount;
    }

    public async Task<decimal> RefundProjectPendingEarningsToClientAsync(
        Project project,
        ExpertProfile expertProfile,
        ClientProfile clientProfile,
        int? disputeId = null)
    {
        var refundAmount = await GetPendingEarningsForProjectAsync(
            project.ProjectId,
            expertProfile.UserId);

        if (refundAmount <= 0)
        {
            return 0m;
        }

        var expertWallet = await GetOrCreateWalletAsync(expertProfile.UserId);
        var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);

        if (expertWallet.PendingEarningsBalance < refundAmount)
        {
            throw new InvalidOperationException("Expert pending earnings balance is insufficient for dispute refund.");
        }

        expertWallet.PendingEarningsBalance -= refundAmount;
        expertWallet.UpdatedAt = VietnamDateTime.Now;

        clientWallet.AvailableBalance += refundAmount;
        clientWallet.UpdatedAt = VietnamDateTime.Now;

        var referenceId = disputeId.HasValue
            ? $"DISPUTE_{disputeId.Value}"
            : $"PROJECT_{project.ProjectId}";

        _context.Transactions.Add(new Transaction
        {
            UserId = expertProfile.UserId,
            ProjectId = project.ProjectId,
            Amount = refundAmount,
            Type = TxExpertPendingEarningRefund,
            Status = TransactionStatusSuccess,
            Description = disputeId.HasValue
                ? $"[Expert Pending Earning Refund] Refunded held earnings to Client from Dispute ID {disputeId.Value}"
                : $"[Expert Pending Earning Refund] Refunded held earnings to Client for Project ID {project.ProjectId}",
            ReferenceId = referenceId,
            CreatedAt = VietnamDateTime.Now
        });

        _context.Transactions.Add(new Transaction
        {
            UserId = clientProfile.UserId,
            ProjectId = project.ProjectId,
            Amount = refundAmount,
            Type = TxExpertPendingEarningRefund,
            Status = TransactionStatusSuccess,
            Description = disputeId.HasValue
                ? $"[Expert Pending Earning Refund] Received held earnings refund from Dispute ID {disputeId.Value}"
                : $"[Expert Pending Earning Refund] Received held earnings refund for Project ID {project.ProjectId}",
            ReferenceId = referenceId,
            CreatedAt = VietnamDateTime.Now
        });

        return refundAmount;
    }

    private async Task<Wallet> GetOrCreateWalletAsync(int userId)
    {
        var wallet = await _context.Wallets
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (wallet != null)
        {
            return wallet;
        }

        var userExists = await _context.Users.AnyAsync(x => x.UserId == userId);

        if (!userExists)
        {
            throw new InvalidOperationException("User not found.");
        }

        wallet = new Wallet
        {
            UserId = userId,
            AvailableBalance = 0m,
            LockedBalance = 0m,
            PendingEarningsBalance = 0m,
            TotalEarning = 0m,
            UpdatedAt = VietnamDateTime.Now
        };

        _context.Wallets.Add(wallet);
        await _context.SaveChangesAsync();

        return wallet;
    }
}
