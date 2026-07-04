using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Common;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Reviews
{
    public class ReviewReportService : IReviewReportService
    {
        private const string ReviewStatusVisible = "VISIBLE";
        private const string ReviewStatusHidden = "HIDDEN";

        private const string ReportStatusOpen = "OPEN";
        private const string ReportStatusAccepted = "ACCEPTED";
        private const string ReportStatusRejected = "REJECTED";

        private const string DecisionAccept = "ACCEPT";
        private const string DecisionReject = "REJECT";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public ReviewReportService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<ReviewReportResponse> ReportReviewAsync(
            int currentExpertUserId,
            int reviewId,
            ReportReviewRequest request)
        {
            ValidateReportReviewRequest(request);

            var review = await _context.Reviews
                .FirstOrDefaultAsync(x => x.ReviewId == reviewId);

            if (review == null)
            {
                throw new InvalidOperationException("Review not found.");
            }

            if (review.ExpertId != currentExpertUserId)
            {
                throw new UnauthorizedAccessException("Only the Expert who received this review can report it.");
            }

            if (!string.Equals(review.Status, ReviewStatusVisible, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only visible reviews can be reported.");
            }

            var hasOpenReport = await _context.ReviewReports.AnyAsync(x =>
                x.ReviewId == reviewId &&
                x.Status == ReportStatusOpen);

            if (hasOpenReport)
            {
                throw new InvalidOperationException("This review already has an open report waiting for admin review.");
            }

            var project = await GetProjectByIdAsync(review.ProjectId);

            var report = new ReviewReport
            {
                ReviewId = review.ReviewId,
                ProjectId = project.ProjectId,
                ExpertUserId = currentExpertUserId,
                Reason = request.Reason.Trim(),
                Status = ReportStatusOpen,
                CreatedAt = VietnamDateTime.Now
            };

            _context.ReviewReports.Add(report);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                currentExpertUserId,
                "Review report submitted",
                $"Your report for the review on project '{project.Title}' has been submitted to Admin.",
                "REVIEW_REPORT_SUBMITTED",
                relatedEntityType: "REVIEW_REPORT",
                relatedEntityId: report.ReviewReportId,
                relatedProjectId: project.ProjectId);

            return await MapToReviewReportResponseAsync(report.ReviewReportId);
        }

        public async Task<IReadOnlyList<ReviewReportResponse>> GetAdminReviewReportsAsync(
            string? status,
            int take)
        {
            var normalizedTake = Math.Clamp(take, 1, 200);

            IQueryable<ReviewReport> query = _context.ReviewReports.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToUpperInvariant();
                query = query.Where(x => x.Status == normalizedStatus);
            }

            var reportIds = await query
                .OrderByDescending(x => x.CreatedAt)
                .Take(normalizedTake)
                .Select(x => x.ReviewReportId)
                .ToListAsync();

            var responses = new List<ReviewReportResponse>();

            foreach (var reportId in reportIds)
            {
                responses.Add(await MapToReviewReportResponseAsync(reportId));
            }

            return responses;
        }

        public async Task<ReviewReportDetailResponse> GetAdminReviewReportByIdAsync(
            int reviewReportId)
        {
            return await MapToReviewReportDetailResponseAsync(reviewReportId);
        }

        public async Task<ReviewReportDetailResponse> ResolveReviewReportAsync(
            int adminUserId,
            int reviewReportId,
            ResolveReviewReportRequest request)
        {
            ValidateResolveReviewReportRequest(request);

            var admin = await _context.Users
                .FirstOrDefaultAsync(x => x.UserId == adminUserId);

            if (admin == null || !string.Equals(admin.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Only Admin can resolve review reports.");
            }

            var report = await _context.ReviewReports
                .FirstOrDefaultAsync(x => x.ReviewReportId == reviewReportId);

            if (report == null)
            {
                throw new InvalidOperationException("Review report not found.");
            }

            if (!string.Equals(report.Status, ReportStatusOpen, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only OPEN review reports can be resolved.");
            }

            var review = await _context.Reviews
                .FirstOrDefaultAsync(x => x.ReviewId == report.ReviewId);

            if (review == null)
            {
                throw new InvalidOperationException("Review not found.");
            }

            var now = VietnamDateTime.Now;
            var decision = request.Decision.Trim().ToUpperInvariant();
            var adminDecision = request.AdminDecision.Trim();

            if (decision == DecisionAccept)
            {
                report.Status = ReportStatusAccepted;
                report.AdminDecision = adminDecision;
                report.ResolvedByAdminId = adminUserId;
                report.ResolvedAt = now;

                review.Status = ReviewStatusHidden;
                review.HiddenReason = adminDecision;
                review.HiddenByAdminId = adminUserId;
                review.HiddenAt = now;

                await _notificationService.CreateNotificationAsync(
                    report.ExpertUserId,
                    "Review report accepted",
                    "Admin accepted your review report. The review has been hidden from the expert profile.",
                    "REVIEW_REPORT_ACCEPTED",
                    relatedEntityType: "REVIEW_REPORT",
                    relatedEntityId: report.ReviewReportId,
                    relatedProjectId: report.ProjectId);
            }
            else
            {
                report.Status = ReportStatusRejected;
                report.AdminDecision = adminDecision;
                report.ResolvedByAdminId = adminUserId;
                report.ResolvedAt = now;

                await _notificationService.CreateNotificationAsync(
                    report.ExpertUserId,
                    "Review report rejected",
                    "Admin rejected your review report. The review remains visible.",
                    "REVIEW_REPORT_REJECTED",
                    relatedEntityType: "REVIEW_REPORT",
                    relatedEntityId: report.ReviewReportId,
                    relatedProjectId: report.ProjectId);
            }

            await _context.SaveChangesAsync();

            return await MapToReviewReportDetailResponseAsync(report.ReviewReportId);
        }

        private static void ValidateReportReviewRequest(ReportReviewRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Review report request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                throw new InvalidOperationException("Report reason is required.");
            }

            if (request.Reason.Trim().Length > 1000)
            {
                throw new InvalidOperationException("Report reason cannot exceed 1000 characters.");
            }
        }

        private static void ValidateResolveReviewReportRequest(ResolveReviewReportRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Resolve review report request is required.");
            }

            var decision = request.Decision?.Trim().ToUpperInvariant();

            if (decision != DecisionAccept && decision != DecisionReject)
            {
                throw new InvalidOperationException("Decision must be ACCEPT or REJECT.");
            }

            if (string.IsNullOrWhiteSpace(request.AdminDecision))
            {
                throw new InvalidOperationException("Admin decision is required.");
            }

            if (request.AdminDecision.Trim().Length > 1000)
            {
                throw new InvalidOperationException("Admin decision cannot exceed 1000 characters.");
            }
        }

        private async Task<Project> GetProjectByIdAsync(int projectId)
        {
            var project = await _context.Projects
                .FirstOrDefaultAsync(x => x.ProjectId == projectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            return project;
        }

        private async Task<ReviewReportResponse> MapToReviewReportResponseAsync(int reportId)
        {
            var detail = await MapToReviewReportDetailResponseAsync(reportId, includeProjectContext: false);

            return new ReviewReportResponse
            {
                ReviewReportId = detail.ReviewReportId,
                ReviewId = detail.ReviewId,
                ProjectId = detail.ProjectId,
                ProjectTitle = detail.ProjectTitle,
                ExpertUserId = detail.ExpertUserId,
                ExpertName = detail.ExpertName,
                ClientUserId = detail.ClientUserId,
                ClientName = detail.ClientName,
                Rating = detail.Rating,
                ReviewComment = detail.ReviewComment,
                ReviewStatus = detail.ReviewStatus,
                Reason = detail.Reason,
                Status = detail.Status,
                AdminDecision = detail.AdminDecision,
                ResolvedByAdminId = detail.ResolvedByAdminId,
                CreatedAt = detail.CreatedAt,
                ResolvedAt = detail.ResolvedAt
            };
        }

        private async Task<ReviewReportDetailResponse> MapToReviewReportDetailResponseAsync(
            int reportId,
            bool includeProjectContext = true)
        {
            var report = await _context.ReviewReports
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ReviewReportId == reportId);

            if (report == null)
            {
                throw new InvalidOperationException("Review report not found.");
            }

            var review = await _context.Reviews
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ReviewId == report.ReviewId);

            if (review == null)
            {
                throw new InvalidOperationException("Review not found.");
            }

            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProjectId == report.ProjectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            var contract = await _context.ProjectContracts
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ContractId == project.ContractId);

            if (contract == null)
            {
                throw new InvalidOperationException("Project contract not found.");
            }

            var clientUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == review.ClientId);

            if (clientUser == null)
            {
                throw new InvalidOperationException("Client user not found.");
            }

            var expertUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == review.ExpertId);

            if (expertUser == null)
            {
                throw new InvalidOperationException("Expert user not found.");
            }

            var response = new ReviewReportDetailResponse
            {
                ReviewReportId = report.ReviewReportId,
                ReviewId = report.ReviewId,
                ProjectId = report.ProjectId,
                ProjectTitle = project.Title,
                ExpertUserId = report.ExpertUserId,
                ExpertName = expertUser.FullName,
                ClientUserId = clientUser.UserId,
                ClientName = clientUser.FullName,
                Rating = review.Rating,
                ReviewComment = review.Comment,
                ReviewStatus = review.Status,
                Reason = report.Reason,
                Status = report.Status,
                AdminDecision = report.AdminDecision,
                ResolvedByAdminId = report.ResolvedByAdminId,
                CreatedAt = report.CreatedAt,
                ResolvedAt = report.ResolvedAt,
                ContractFinalPrice = contract.FinalPrice,
                ExpertReceivableAmount = contract.ExpertReceivableAmount,
                ProjectStatus = project.Status,
                ProjectStartDate = project.StartDate,
                ProjectEndDate = project.EndDate
            };

            if (!includeProjectContext)
            {
                return response;
            }

            response.Milestones = await BuildMilestoneSummariesAsync(project.ProjectId);
            response.Disputes = await BuildDisputeSummariesAsync(project.ProjectId);

            return response;
        }

        private async Task<IReadOnlyList<ReviewReportMilestoneSummaryResponse>> BuildMilestoneSummariesAsync(int projectId)
        {
            var milestones = await _context.Milestones
                .AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .OrderBy(x => x.OrderIndex)
                .ThenBy(x => x.MilestoneId)
                .ToListAsync();

            var result = new List<ReviewReportMilestoneSummaryResponse>();

            foreach (var milestone in milestones)
            {
                var deliverables = await _context.Deliverables
                    .AsNoTracking()
                    .Where(x => x.MilestoneId == milestone.MilestoneId)
                    .OrderBy(x => x.VersionNumber)
                    .ThenBy(x => x.DeliverableId)
                    .ToListAsync();

                result.Add(new ReviewReportMilestoneSummaryResponse
                {
                    MilestoneId = milestone.MilestoneId,
                    Title = milestone.Title,
                    Amount = milestone.Amount,
                    OrderIndex = milestone.OrderIndex,
                    Status = milestone.Status,
                    PaymentStatus = milestone.PaymentStatus,
                    Deadline = milestone.Deadline,
                    DeliverableCount = deliverables.Count,
                    SubmittedDeliverableCount = deliverables.Count(x => string.Equals(x.Status, "SUBMITTED", StringComparison.OrdinalIgnoreCase)),
                    ApprovedDeliverableCount = deliverables.Count(x => string.Equals(x.Status, "APPROVED", StringComparison.OrdinalIgnoreCase)),
                    RevisionRequestedDeliverableCount = deliverables.Count(x => string.Equals(x.Status, "REVISION_REQUESTED", StringComparison.OrdinalIgnoreCase)),
                    Deliverables = deliverables.Select(x => new ReviewReportDeliverableSummaryResponse
                    {
                        DeliverableId = x.DeliverableId,
                        VersionNumber = x.VersionNumber,
                        Status = x.Status,
                        Description = x.Description,
                        ClientFeedback = x.ClientFeedback,
                        SubmittedAt = x.SubmittedAt,
                        ReviewedAt = x.ReviewedAt
                    }).ToList()
                });
            }

            return result;
        }

        private async Task<IReadOnlyList<ReviewReportDisputeSummaryResponse>> BuildDisputeSummariesAsync(int projectId)
        {
            var disputes = await _context.Disputes
                .AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return disputes.Select(x => new ReviewReportDisputeSummaryResponse
            {
                DisputeId = x.DisputeId,
                MilestoneId = x.MilestoneId,
                Reason = x.Reason,
                DisputedAmount = x.DisputedAmount,
                Status = x.Status,
                ResolutionType = x.ResolutionType,
                AdminDecision = x.AdminDecision,
                CreatedAt = x.CreatedAt,
                ResolvedAt = x.ResolvedAt
            }).ToList();
        }
    }
}
