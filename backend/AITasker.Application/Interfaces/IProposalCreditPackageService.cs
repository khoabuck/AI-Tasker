using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IProposalCreditPackageService
{
    Task<List<ProposalCreditPackageResponse>> GetActivePackagesAsync();

    Task<ProposalCreditPackagePageResponse> GetMyCreditPageAsync(int userId);

    Task<List<ProposalCreditPackageResponse>> GetAdminPackagesAsync();

    Task<ProposalCreditPackageResponse?> GetPackageByIdAsync(int packageId);

    Task<ProposalCreditPackageResponse> CreatePackageAsync(
        int adminId,
        CreateProposalCreditPackageRequest request);

    Task<ProposalCreditPackageResponse?> UpdatePackageAsync(
        int adminId,
        int packageId,
        UpdateProposalCreditPackageRequest request);

    Task<ProposalCreditPackageResponse?> SetPackageActiveAsync(
        int adminId,
        int packageId,
        bool isActive,
        string? reason);

    Task<ProposalCreditPackagePurchaseResultResponse> PurchasePackageAsync(
        int userId,
        int packageId);

    Task<List<ProposalCreditPackagePurchaseResponse>> GetMyPurchasesAsync(int userId);
}