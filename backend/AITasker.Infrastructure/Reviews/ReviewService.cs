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
        private readonly AITaskerDbContext _context;

        public ReviewService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<ReviewResponse> CreateProjectReviewAsync(
            int projectId,
            int currentUserId,
            CreateReviewRequest request)
        {
            if (request.Rating < 1 || request.Rating > 5)
                throw new InvalidOperationException("Rating must be between 1 and 5.");

            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            if (project == null)
                throw new InvalidOperationException("Project not found.");

            if (!string.Equals(project.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Only completed projects can be reviewed.");

            var contract = await _context.ProjectContracts
                .FirstOrDefaultAsync(c => c.ContractId == project.ContractId);

            if (contract == null)
                throw new InvalidOperationException("Project contract not found.");

            if (contract.ClientId != currentUserId)
                throw new UnauthorizedAccessException("Only the project client can review this expert.");

            var alreadyReviewed = await _context.Reviews
                .AnyAsync(r => r.ProjectId == projectId);

            if (alreadyReviewed)
                throw new InvalidOperationException("This project has already been reviewed.");

            var comment = string.IsNullOrWhiteSpace(request.Comment)
                ? null
                : request.Comment.Trim();

            if (comment != null && comment.Length > 1000)
                throw new InvalidOperationException("Review comment cannot exceed 1000 characters.");

            var review = new Review
            {
                ProjectId = project.ProjectId,
                ClientId = contract.ClientId,
                ExpertId = contract.ExpertId,
                Rating = request.Rating,
                Comment = comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return await BuildReviewResponseAsync(review.ReviewId);
        }

        public async Task<IReadOnlyList<ReviewResponse>> GetExpertReviewsAsync(int expertId)
        {
            return await _context.Reviews
                .AsNoTracking()
                .Where(r => r.ExpertId == expertId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewResponse
                {
                    ReviewId = r.ReviewId,
                    ProjectId = r.ProjectId,
                    ClientId = r.ClientId,
                    ClientName = r.Client.FullName,
                    ClientAvatarUrl = r.Client.AvatarUrl,
                    ExpertId = r.ExpertId,
                    ExpertName = r.Expert.FullName,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();
        }

        private async Task<ReviewResponse> BuildReviewResponseAsync(int reviewId)
        {
            return await _context.Reviews
                .AsNoTracking()
                .Where(r => r.ReviewId == reviewId)
                .Select(r => new ReviewResponse
                {
                    ReviewId = r.ReviewId,
                    ProjectId = r.ProjectId,
                    ClientId = r.ClientId,
                    ClientName = r.Client.FullName,
                    ClientAvatarUrl = r.Client.AvatarUrl,
                    ExpertId = r.ExpertId,
                    ExpertName = r.Expert.FullName,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt
                })
                .FirstAsync();
        }
    }
}