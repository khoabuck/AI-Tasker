using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Reviews
{
    public class ReviewService : IReviewService
    {
        private const string ProjectStatusCompleted = "COMPLETED";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public ReviewService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<ReviewResponse> CreateProjectReviewAsync(
            int projectId,
            int currentUserId,
            CreateReviewRequest request)
        {
            ValidateCreateReviewRequest(request);

            var project = await GetProjectByIdAsync(projectId);

            if (!string.Equals(project.Status, ProjectStatusCompleted, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only completed projects can be reviewed.");
            }

            var contract = await GetContractByIdAsync(project.ContractId);

            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            if (clientProfile.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("Only the project Client can review this expert.");
            }

            var alreadyReviewed = await _context.Reviews
                .AnyAsync(r => r.ProjectId == projectId);

            var hasOpenDispute = await _context.Disputes.AnyAsync(d =>
                d.ProjectId == projectId &&
                d.Status == "OPEN");

            if (hasOpenDispute)
            {
                throw new InvalidOperationException("Project still has an open dispute and cannot be reviewed.");
            }

            if (alreadyReviewed)
            {
                throw new InvalidOperationException("This project has already been reviewed.");
            }

            var comment = NormalizeComment(request.Comment);

            var review = new Review
            {
                ProjectId = project.ProjectId,

                ClientId = clientProfile.UserId,
                ExpertId = expertProfile.UserId,

                Rating = request.Rating,
                Comment = comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "New review received",
                $"You received a {request.Rating}-star review for project '{project.Title}'.",
                "REVIEW_RECEIVED");

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Review submitted",
                $"You submitted a review for project '{project.Title}'.",
                "REVIEW_SUBMITTED");

            return await MapToReviewResponseAsync(review.ReviewId);
        }

        public async Task<ReviewResponse> GetProjectReviewAsync(
            int currentUserId,
            int projectId)
        {
            var project = await GetProjectByIdAsync(projectId);
            await EnsureCanAccessProjectAsync(currentUserId, project);

            var review = await _context.Reviews
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ProjectId == projectId);

            if (review == null)
            {
                throw new InvalidOperationException("Review not found for this project.");
            }

            return await MapToReviewResponseAsync(review.ReviewId);
        }

        public async Task<IReadOnlyList<ReviewResponse>> GetExpertReviewsAsync(
            int expertProfileId)
        {
            var expertProfile = await GetExpertProfileByIdAsync(expertProfileId);

            var reviewIds = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.ExpertId == expertProfile.UserId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => r.ReviewId)
                .ToListAsync();

            var responses = new List<ReviewResponse>();

            foreach (var reviewId in reviewIds)
            {
                responses.Add(await MapToReviewResponseAsync(reviewId));
            }

            return responses;
        }

        public async Task<IReadOnlyList<ReviewResponse>> GetMyReviewsAsync(
            int currentUserId)
        {
            var user = await GetUserByIdAsync(currentUserId);

            IQueryable<Review> query = _context.Reviews.AsNoTracking();

            if (string.Equals(user.Role, "CLIENT", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(r => r.ClientId == currentUserId);
            }
            else if (string.Equals(user.Role, "EXPERT", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(r => r.ExpertId == currentUserId);
            }
            else if (!string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("You do not have permission to view reviews.");
            }

            var reviewIds = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => r.ReviewId)
                .ToListAsync();

            var responses = new List<ReviewResponse>();

            foreach (var reviewId in reviewIds)
            {
                responses.Add(await MapToReviewResponseAsync(reviewId));
            }

            return responses;
        }

        private static void ValidateCreateReviewRequest(CreateReviewRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Review request is required.");
            }

            if (request.Rating < 1 || request.Rating > 5)
            {
                throw new InvalidOperationException("Rating must be between 1 and 5.");
            }

            if (!string.IsNullOrWhiteSpace(request.Comment) &&
                request.Comment.Trim().Length > 1000)
            {
                throw new InvalidOperationException("Review comment cannot exceed 1000 characters.");
            }
        }

        private static string? NormalizeComment(string? comment)
        {
            if (string.IsNullOrWhiteSpace(comment))
            {
                return null;
            }

            return comment.Trim();
        }

        private async Task EnsureCanAccessProjectAsync(
            int currentUserId,
            Project project)
        {
            var user = await GetUserByIdAsync(currentUserId);

            if (string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var contract = await GetContractByIdAsync(project.ContractId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            if (clientProfile.UserId == currentUserId ||
                expertProfile.UserId == currentUserId)
            {
                return;
            }

            throw new UnauthorizedAccessException("You do not have permission to access this project review.");
        }

        private async Task<Project> GetProjectByIdAsync(int projectId)
        {
            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            return project;
        }

        private async Task<ProjectContract> GetContractByIdAsync(int contractId)
        {
            var contract = await _context.ProjectContracts
                .FirstOrDefaultAsync(c => c.ContractId == contractId);

            if (contract == null)
            {
                throw new InvalidOperationException("Project contract not found.");
            }

            return contract;
        }

        private async Task<ClientProfile> GetClientProfileByIdAsync(int clientProfileId)
        {
            var clientProfile = await _context.ClientProfiles
                .FirstOrDefaultAsync(c => c.ClientProfileId == clientProfileId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            return clientProfile;
        }

        private async Task<ExpertProfile> GetExpertProfileByIdAsync(int expertProfileId)
        {
            var expertProfile = await _context.ExpertProfiles
                .FirstOrDefaultAsync(e => e.ExpertProfileId == expertProfileId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            return expertProfile;
        }

        private async Task<User> GetUserByIdAsync(int userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            return user;
        }

        private async Task<ReviewResponse> MapToReviewResponseAsync(int reviewId)
        {
            var review = await _context.Reviews
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ReviewId == reviewId);

            if (review == null)
            {
                throw new InvalidOperationException("Review not found.");
            }

            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProjectId == review.ProjectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            var contract = await _context.ProjectContracts
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ContractId == project.ContractId);

            if (contract == null)
            {
                throw new InvalidOperationException("Project contract not found.");
            }

            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClientProfileId == contract.ClientId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.ExpertProfileId == contract.ExpertId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var clientUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == review.ClientId);

            if (clientUser == null)
            {
                throw new InvalidOperationException("Client user not found.");
            }

            var expertUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == review.ExpertId);

            if (expertUser == null)
            {
                throw new InvalidOperationException("Expert user not found.");
            }

            return new ReviewResponse
            {
                ReviewId = review.ReviewId,
                ProjectId = review.ProjectId,
                ProjectTitle = project.Title,

                ClientId = review.ClientId,
                ClientUserId = review.ClientId,
                ClientProfileId = clientProfile.ClientProfileId,
                ClientName = clientUser.FullName,
                ClientAvatarUrl = clientUser.AvatarUrl,

                ExpertId = review.ExpertId,
                ExpertUserId = review.ExpertId,
                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertName = expertUser.FullName,
                ExpertAvatarUrl = expertUser.AvatarUrl,

                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt
            };
        }
    }
}