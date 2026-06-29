using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IAdminDashboardService
    {
        Task<AdminDashboardSummaryResponse> GetSummaryAsync();

        Task<AdminRevenueResponse> GetRevenueAsync();

        Task<IReadOnlyList<AdminProjectDashboardItemResponse>> GetProjectsAsync();

        Task<AdminFinanceOverviewResponse> GetFinanceOverviewAsync();

        Task<PlatformWalletResponse> GetPlatformWalletAsync();

        Task<IReadOnlyList<PlatformTransactionResponse>> GetPlatformTransactionsAsync(
            string? type = null,
            int take = 100);

        Task<IReadOnlyList<AdminUserWalletResponse>> GetUserWalletsAsync(
            string? role = null,
            int take = 100);

        Task<IReadOnlyList<AdminRevenueTransactionItemResponse>> GetTransactionsAsync(
            string? type = null,
            int take = 100);

        Task<IReadOnlyList<AdminEscrowFinanceItemResponse>> GetEscrowsAsync(
            string? status = null,
            int take = 100);
    }
}