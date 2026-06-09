using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepository;

    public ReviewService(IReviewRepository reviewRepository)
    {
        _reviewRepository = reviewRepository;
    }

    public async Task<ReviewResponse> CreateAsync(int userId, int projectId, CreateReviewRequest request)
    {
        var client = await _reviewRepository.GetClientProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Client profile not found.");

        var project = await _reviewRepository.GetProjectByIdAsync(projectId)
            ?? throw new InvalidOperationException("Project not found.");

        if (project.ClientProfileId != client.ClientProfileId)
        {
            throw new InvalidOperationException("Only the project client can review.");
        }

        if (project.Status != "COMPLETED")
        {
            throw new InvalidOperationException("Review is allowed only when the project is COMPLETED.");
        }

        if (request.Rating is < 1 or > 5)
        {
            throw new InvalidOperationException("Rating must be between 1 and 5.");
        }

        if (string.IsNullOrWhiteSpace(request.Comment))
        {
            throw new InvalidOperationException("Comment is required.");
        }

        if (await _reviewRepository.ExistsByProjectIdAsync(projectId))
        {
            throw new InvalidOperationException("This project already has a review.");
        }

        var revieweeUserId = project.ExpertProfile?.UserId
            ?? throw new InvalidOperationException("Expert profile for this project was not found.");
        if (revieweeUserId == client.UserId)
        {
            throw new InvalidOperationException("Reviewer and reviewee cannot be the same user.");
        }

        var review = new Review
        {
            ProjectId = projectId,
            ReviewerId = client.UserId,
            RevieweeId = revieweeUserId,
            Rating = request.Rating,
            Comment = request.Comment.Trim(),
            Status = "VISIBLE",
            CreatedAt = DateTime.UtcNow
        };

        await _reviewRepository.AddAsync(review);
        await _reviewRepository.SaveChangesAsync();

        await RecomputeExpertRatingAsync(revieweeUserId);

        return ToResponse(review);
    }

    public async Task<PagedResult<ReviewResponse>> GetExpertReviewsAsync(int expertProfileId, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var expert = await _reviewRepository.GetExpertProfileByIdAsync(expertProfileId)
            ?? throw new InvalidOperationException("Expert not found.");

        var skip = (page - 1) * pageSize;
        var reviews = await _reviewRepository.GetVisibleReviewsPagedByRevieweeUserIdAsync(expert.UserId, skip, pageSize);
        var total = await _reviewRepository.CountVisibleReviewsByRevieweeUserIdAsync(expert.UserId);

        return new PagedResult<ReviewResponse>
        {
            Items = reviews.Select(ToResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }

    public async Task<List<ReviewResponse>> GetMyReceivedAsync(int userId)
    {
        var expert = await _reviewRepository.GetExpertProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Expert profile not found.");

        var reviews = await _reviewRepository.GetVisibleReviewsByRevieweeUserIdAsync(expert.UserId);
        return reviews.Select(ToResponse).ToList();
    }

    public async Task<ReviewResponse> HideAsync(int reviewId)
    {
        var review = await _reviewRepository.GetByIdAsync(reviewId)
            ?? throw new InvalidOperationException("Review not found.");

        if (review.Status != "HIDDEN")
        {
            review.Status = "HIDDEN";
            await _reviewRepository.SaveChangesAsync();
            await RecomputeExpertRatingAsync(review.RevieweeId);
        }

        return ToResponse(review);
    }

    private async Task RecomputeExpertRatingAsync(int revieweeUserId)
    {
        var expert = await _reviewRepository.GetExpertProfileByUserIdAsync(revieweeUserId);
        if (expert == null)
        {
            return;
        }

        var visible = await _reviewRepository.GetVisibleReviewsByRevieweeUserIdAsync(revieweeUserId);

        expert.ReviewCount = visible.Count;
        expert.RatingAverage = visible.Count == 0
            ? 0
            : Math.Round((decimal)visible.Average(x => x.Rating), 2);

        await _reviewRepository.SaveChangesAsync();
    }

    private static ReviewResponse ToResponse(Review review)
    {
        return new ReviewResponse
        {
            ReviewId = review.ReviewId,
            ProjectId = review.ProjectId,
            ReviewerId = review.ReviewerId,
            RevieweeId = review.RevieweeId,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            CreatedAt = review.CreatedAt
        };
    }
}
