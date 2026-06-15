using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IAdminDashboardService
    {
        Task<AdminDashboardSummaryResponse> GetSummaryAsync();

        Task<AdminRevenueResponse> GetRevenueAsync();

        Task<IReadOnlyList<AdminProjectDashboardItemResponse>> GetProjectsAsync();
    }
}