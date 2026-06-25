using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IJobCreditPackageService
{
    Task<List<JobCreditPackageResponse>> GetActivePackagesAsync();

    Task<List<JobCreditPackageResponse>> GetAdminPackagesAsync();

    Task<JobCreditPackageResponse?> GetPackageByIdAsync(int packageId);

    Task<JobCreditPackageResponse> CreatePackageAsync(
        int adminId,
        CreateJobCreditPackageRequest request);

    Task<JobCreditPackageResponse?> UpdatePackageAsync(
        int adminId,
        int packageId,
        UpdateJobCreditPackageRequest request);

    Task<JobCreditPackageResponse?> SetPackageActiveAsync(
        int adminId,
        int packageId,
        bool isActive,
        string? reason);

    Task<JobCreditPackagePurchaseResultResponse> PurchasePackageAsync(
        int userId,
        int packageId);

    Task<List<JobCreditPackagePurchaseResponse>> GetMyPurchasesAsync(int userId);
}
