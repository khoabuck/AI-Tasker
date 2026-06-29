using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IPlatformWalletService
    {
        Task<PlatformWalletResponse> GetPlatformWalletAsync();

        Task<IReadOnlyList<PlatformTransactionResponse>> GetPlatformTransactionsAsync(
            string? type = null,
            int take = 100);

        Task RecordPlatformFeeAsync(
            int projectId,
            int contractId,
            int clientUserId,
            decimal amount,
            string referenceId,
            DateTime createdAt);
    }
}