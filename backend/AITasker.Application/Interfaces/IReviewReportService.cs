using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IReviewReportService
    {
        Task<ReviewReportResponse> ReportReviewAsync(
            int currentExpertUserId,
            int reviewId,
            ReportReviewRequest request);

        Task<IReadOnlyList<ReviewReportResponse>> GetAdminReviewReportsAsync(
            string? status,
            int take);

        Task<ReviewReportDetailResponse> GetAdminReviewReportByIdAsync(
            int reviewReportId);

        Task<ReviewReportDetailResponse> ResolveReviewReportAsync(
            int adminUserId,
            int reviewReportId,
            ResolveReviewReportRequest request);
    }
}
